/**
 * SSIP Cafeteria Authentication Proxy Server
 *
 * Deployed on Render.com (Singapore region) so it can reach
 * ssip-cafeteria.whew.life without being blocked by Wordfence.
 *
 * Wordfence blocks Cloudflare datacenter IPs but NOT Render/AWS Singapore IPs.
 *
 * Routes:
 *   GET  /          → health check
 *   GET  /health    → health check
 *   GET  /debug     → test connectivity to cafeteria backend
 *   POST /api/auth  → authenticate staff credentials, return session
 */

import express from 'express';
import cors from 'cors';

const TARGET_HOST = 'https://ssip-cafeteria.whew.life';
const PORT = process.env.PORT || 3001;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const app = express();

// Allow all origins — GitHub Pages, office LAN, mobile
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':  return '&lt;';
      case '>':  return '&gt;';
      case '&':  return '&amp;';
      case "'":  return '&apos;';
      case '"':  return '&quot;';
      default:   return c;
    }
  });
}

function buildXmlRpcPayload(username, password) {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getUsersBlogs</methodName>
  <params>
    <param><value><string>${escapeXml(username)}</string></value></param>
    <param><value><string>${escapeXml(password)}</string></value></param>
  </params>
</methodCall>`;
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'SSIP Cafeteria Auth Server', region: 'Singapore' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────────
// Debug endpoint — test backend reachability
// ─────────────────────────────────────────────

app.get('/debug', async (_req, res) => {
  const results = {};

  // Test XML-RPC with dummy credentials
  try {
    const xmlRes = await fetch(`${TARGET_HOST}/xmlrpc.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': BROWSER_UA },
      body: buildXmlRpcPayload('testuser', 'testpass'),
    });
    const xmlText = await xmlRes.text();
    results.xmlRpc = {
      status:   xmlRes.status,
      length:   xmlText.length,
      isFault:  xmlText.includes('<fault>'),
      isXml:    xmlText.includes('<methodResponse>'),
      blocked:  xmlText.includes('Your access to this site has been limited'),
      snippet:  xmlText.slice(0, 200),
    };
  } catch (e) {
    results.xmlRpc = { error: e.message };
  }

  // Test public user list
  try {
    const dirRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/asset_management/get-user-list`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    results.userList = { status: dirRes.status, ok: dirRes.ok };
  } catch (e) {
    results.userList = { error: e.message };
  }

  res.json(results);
});

// ─────────────────────────────────────────────
// POST /api/auth — main authentication endpoint
// ─────────────────────────────────────────────

app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = (username || '').trim().toUpperCase();

  if (!cleanUser || !password) {
    return res.status(400).json({
      success: false,
      error:   'Please enter both username and password.',
    });
  }

  // ── Step 1: Validate credentials via WordPress XML-RPC ──────────────────

  let xmlText;
  let xmlStatus;

  try {
    const xmlRes = await fetch(`${TARGET_HOST}/xmlrpc.php`, {
      method:  'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': BROWSER_UA },
      body:    buildXmlRpcPayload(cleanUser, password),
    });
    xmlStatus = xmlRes.status;
    xmlText   = await xmlRes.text();
  } catch (fetchErr) {
    console.error('XML-RPC network error:', fetchErr.message);
    return res.status(502).json({
      success: false,
      error:   'Unable to reach cafeteria server. Please try again.',
    });
  }

  // Wordfence block / unexpected response
  if (xmlStatus !== 200 || !xmlText.includes('<methodResponse>')) {
    const isWordfence = xmlText.includes('Your access to this site has been limited');
    console.warn('XML-RPC blocked or unexpected response. Status:', xmlStatus, 'Wordfence:', isWordfence);
    return res.status(502).json({
      success: false,
      error: isWordfence
        ? 'Cafeteria server is temporarily blocking this proxy. Please contact IT or use the office portal.'
        : `Unable to verify credentials with cafeteria server (HTTP ${xmlStatus}).`,
    });
  }

  // Invalid credentials — WordPress returns a <fault> element
  if (xmlText.includes('<fault>')) {
    const faultMatch = xmlText.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]+)<\/string>/i);
    const faultMsg   = faultMatch
      ? faultMatch[1].trim()
      : 'Incorrect username or password. Please verify your staff credentials.';
    return res.status(401).json({ success: false, error: faultMsg });
  }

  // Must contain <params> to be a genuine authenticated response
  if (!xmlText.includes('<params>')) {
    return res.status(401).json({
      success: false,
      error:   'Authentication failed. Please verify your employee ID and password.',
    });
  }

  // ── Credentials verified! ────────────────────────────────────────────────

  let displayName = cleanUser.startsWith('SIP')
    ? `SHIMANO EMPLOYEE #${cleanUser.replace(/^SIP/i, '')}`
    : cleanUser;
  let firstName   = cleanUser;
  let lastName    = '';
  const email     = `${cleanUser.toLowerCase()}@shimano.com.sg`;
  const orders    = [];

  // ── Step 2: Fetch real display name from staff directory ────────────────

  try {
    const dirRes  = await fetch(`${TARGET_HOST}/wp-json/wp/v2/asset_management/get-user-list`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (dirRes.ok) {
      const dirData = await dirRes.json();
      if (Array.isArray(dirData?.users)) {
        const numericId = cleanUser.replace(/^SIP/i, '');
        // Match by numeric ID (e.g. "279") since user list uses numeric IDs
        let matched =
          dirData.users.find((u) => u.id === numericId) ||
          dirData.users.find((u) => u.id === cleanUser);
        if (matched?.display_name) {
          displayName  = matched.display_name;
          const parts  = displayName.split(' ');
          firstName    = parts[0] || displayName;
          lastName     = parts.slice(1).join(' ') || '';
        }
      }
    }
  } catch (e) {
    console.warn('Staff directory lookup failed (non-fatal):', e.message);
  }

  // ── Step 3: Fetch meal plan order history from KPOM ────────────────────

  try {
    const kpomRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/kpom/get-user-order-items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
      body:    JSON.stringify({ username: cleanUser }),
    });
    if (kpomRes.ok) {
      const kpomData = await kpomRes.json();
      const items    = kpomData?.mealplan_order_items_data?.order_items;
      if (Array.isArray(items)) {
        for (const item of items) {
          orders.push({
            id:            item.order_id     || `kpom-${Date.now()}-${Math.random()}`,
            orderNumber:   String(item.order_number || item.order_id || ''),
            datePlaced:    item.order_date   || item.delivery_date || '',
            deliveryDate:  item.delivery_date || '',
            status:        item.status       || 'Completed',
            total:         parseFloat(item.price || item.total || '0') || 0,
            customerNote:  item.note         || '',
            mealDate:      item.delivery_date || '',
            paymentMethod: 'Cafeteria Allowance',
            items: [{
              id:       item.product_id || 1,
              name:     item.product_name || item.item_name || 'Meal Order',
              price:    parseFloat(item.price || '0') || 0,
              quantity: item.quantity || 1,
              mealDate: item.delivery_date || '',
            }],
          });
        }
      }
    }
  } catch (e) {
    console.warn('KPOM orders fetch failed (non-fatal):', e.message);
  }

  // ── Step 4: Fetch calendar orders ───────────────────────────────────────

  try {
    const calRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/konbini-order-calendar/get-user-orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
      body:    JSON.stringify({ username: cleanUser }),
    });
    if (calRes.ok) {
      const calData = await calRes.json();
      if (Array.isArray(calData?.data)) {
        for (const ord of calData.data) {
          const ordId = ord.order_id || ord.id;
          if (ordId && !orders.some((o) => String(o.id) === String(ordId))) {
            orders.push({
              id:            ordId,
              orderNumber:   String(ord.order_number || ordId),
              datePlaced:    ord.date   || '',
              deliveryDate:  ord.date   || '',
              status:        'Completed',
              total:         parseFloat(ord.total || '0') || 0,
              items:         [],
              paymentMethod: 'Cafeteria Allowance',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Calendar orders fetch failed (non-fatal):', e.message);
  }

  // ── Return verified session ─────────────────────────────────────────────
  // walletBalance is null — balance API requires machine token we don't have.
  // Frontend will show "Balance unavailable" instead of a fake number.

  console.log(`✅ Auth success: ${cleanUser} (${displayName}), orders: ${orders.length}`);

  return res.json({
    success: true,
    session: {
      isLoggedIn:         true,
      username:           cleanUser,
      displayName,
      email,
      phone:              '',
      firstName,
      lastName,
      walletBalance:      null,   // Cannot fetch without machine sync_passcode
      walletTransactions: [],
      orders,
    },
  });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 SSIP Cafeteria Auth Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
  console.log(`   Auth:   POST http://localhost:${PORT}/api/auth`);
});
