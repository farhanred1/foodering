/**
 * SSIP Cafeteria Authentication Proxy Server
 * Deployed on Render.com (Singapore region).
 *
 * Fully mirrors the actual website experience:
 * 1. Authenticates staff credentials via WordPress XML-RPC wp.getProfile
 * 2. Establishes authenticated WooCommerce web session with CookieJar
 * 3. Scrapes exact Live Wallet Balance and Transaction History from /my-account/woo-wallet/
 * 4. Scrapes past Orders & Line Items from /my-account/orders/ and /my-account/view-order/
 * 5. Extracts official First Name, Last Name, Display Name, Email, and Phone from /my-account/edit-account/
 * 6. Cross-references Shimano staff directory and KPOM/calendar meal pre-orders
 */

import express from 'express';
import cors from 'cors';

const TARGET_HOST = 'https://ssip-cafeteria.whew.life';
const PORT = process.env.PORT || 3001;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────
// Helpers & CookieJar
// ─────────────────────────────────────────────

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeaders(headers) {
    if (!headers) return;
    let rawCookies = [];
    if (typeof headers.getSetCookie === 'function') {
      rawCookies = headers.getSetCookie();
    } else if (headers.get('set-cookie')) {
      rawCookies = headers.get('set-cookie').split(/,(?=[^;]+=[^;]+)/);
    }

    for (const raw of rawCookies) {
      const parts = raw.split(';')[0].trim();
      const eqIdx = parts.indexOf('=');
      if (eqIdx > 0) {
        const key = parts.slice(0, eqIdx).trim();
        const val = parts.slice(eqIdx + 1).trim();
        if (val && val !== 'deleted' && val !== '""') {
          this.cookies.set(key, val);
        } else if (val === 'deleted') {
          this.cookies.delete(key);
        }
      }
    }
  }

  getCookieHeader() {
    const list = [];
    for (const [k, v] of this.cookies.entries()) {
      list.push(`${k}=${v}`);
    }
    return list.join('; ');
  }
}

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

function parseXmlStruct(xml) {
  const result = {};
  const regex = /<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<string>([^<]*)<\/string>|<int>([^<]*)<\/int>|<boolean>([^<]*)<\/boolean>|<dateTime\.iso8601>([^<]*)<\/dateTime\.iso8601>)/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : match[5]));
    result[key] = val;
  }
  return result;
}

function extractPrice(str) {
  if (!str) return 0;
  const cleaned = str
    .replace(/&#36;/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/<span[^>]*class="[^"]*currencySymbol[^"]*"[^>]*>[^<]*<\/span>/gi, '');
  const m = cleaned.match(/([\d]+(?:\.[\d]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

// ─────────────────────────────────────────────
// Health & Diagnostics
// ─────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.5.0',
    service: 'SSIP Cafeteria Auth Server',
    region: 'Singapore',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.5.0' });
});

app.get('/debug', async (_req, res) => {
  const results = {};
  try {
    const xmlPayload = `<?xml version="1.0"?><methodCall><methodName>wp.getUsersBlogs</methodName><params><param><value><string>testuser</string></value></param><param><value><string>testpass</string></value></param></params></methodCall>`;
    const xmlRes = await fetch(`${TARGET_HOST}/xmlrpc.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': BROWSER_UA },
      body: xmlPayload,
    });
    const xmlText = await xmlRes.text();
    results.xmlRpc = {
      status: xmlRes.status,
      length: xmlText.length,
      isFault: xmlText.includes('<fault>'),
      isXml: xmlText.includes('<methodResponse>'),
      blocked: xmlText.includes('Your access to this site has been limited'),
    };
  } catch (e) {
    results.xmlRpc = { error: e.message };
  }

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
  const cleanUser = (username || '').trim();

  if (!cleanUser || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter both username and password.',
    });
  }

  // ── Step 1: Validate credentials via WordPress XML-RPC wp.getProfile ───

  const xmlProfilePayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getProfile</methodName>
  <params>
    <param><value><int>1</int></value></param>
    <param><value><string>${escapeXml(cleanUser)}</string></value></param>
    <param><value><string>${escapeXml(password)}</string></value></param>
  </params>
</methodCall>`;

  let xmlText = '';
  let xmlStatus = 0;

  try {
    const xmlRes = await fetch(`${TARGET_HOST}/xmlrpc.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'User-Agent': BROWSER_UA },
      body: xmlProfilePayload,
    });
    xmlStatus = xmlRes.status;
    xmlText = await xmlRes.text();
  } catch (fetchErr) {
    console.error('XML-RPC network error:', fetchErr.message);
    return res.status(502).json({
      success: false,
      error: 'Unable to connect to cafeteria server for authentication.',
    });
  }

  if (xmlStatus !== 200 || !xmlText.includes('<methodResponse>')) {
    const isWf = xmlText.includes('Your access to this site has been limited');
    return res.status(502).json({
      success: false,
      error: isWf
        ? 'Cafeteria security firewall is temporarily limiting external cloud access.'
        : `Unable to verify credentials with cafeteria server (HTTP ${xmlStatus}).`,
    });
  }

  if (xmlText.includes('<fault>')) {
    const faultMatch = xmlText.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]+)<\/string>/i);
    const faultMsg = faultMatch
      ? faultMatch[1].trim()
      : 'Incorrect username or password. Please verify your staff credentials.';
    return res.status(401).json({ success: false, error: faultMsg });
  }

  if (!xmlText.includes('<params>')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed. Please verify your employee ID and password.',
    });
  }

  // Parse WordPress profile
  const wpProfile = parseXmlStruct(xmlText);
  const upperUser = cleanUser.toUpperCase();
  const numericId = cleanUser.replace(/^SIP/i, '');

  let displayName = wpProfile.display_name || (upperUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${numericId}` : upperUser);
  let firstName = wpProfile.first_name || (displayName ? displayName.split(' ')[0] : upperUser);
  let lastName = wpProfile.last_name || (displayName ? displayName.split(' ').slice(1).join(' ') : '');
  let email = wpProfile.email || `${cleanUser.toLowerCase()}@shimano.com.sg`;
  let phone = '';
  let company = 'Shimano (Singapore) Pte Ltd';
  let walletBalance = 100.0; // Default Shimano monthly allowance cycle
  let foundRealBalance = false;
  const transactions = [];
  const orders = [];

  // ── Step 2: Cross-reference Official Staff Directory for Legal Name ────

  try {
    const dirRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/asset_management/get-user-list`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (dirRes.ok) {
      const dirData = await dirRes.json();
      if (Array.isArray(dirData?.users)) {
        let matched =
          (wpProfile.user_id && dirData.users.find(u => String(u.id) === String(wpProfile.user_id))) ||
          dirData.users.find(u => String(u.id) === cleanUser || String(u.id) === numericId) ||
          (wpProfile.display_name && dirData.users.find(u => u.display_name.toUpperCase() === wpProfile.display_name.toUpperCase())) ||
          (wpProfile.display_name && dirData.users.find(u => u.display_name.toUpperCase().includes(wpProfile.display_name.toUpperCase()))) ||
          dirData.users.find(u => u.display_name.toUpperCase().includes(upperUser)) ||
          (firstName && firstName.length > 2 && dirData.users.find(u => u.display_name.toUpperCase().includes(firstName.toUpperCase())));

        if (matched?.display_name) {
          displayName = matched.display_name;
          const parts = displayName.split(' ');
          firstName = parts[0] || displayName;
          lastName = parts.slice(1).join(' ') || '';
        }
      }
    }
  } catch (e) {
    console.warn('Staff directory lookup skipped:', e.message);
  }

  // ── Step 3: Establish Authenticated WooCommerce Session with CookieJar ─

  const jar = new CookieJar();

  try {
    const initialRes = await fetch(`${TARGET_HOST}/my-account/`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html,application/xhtml+xml' },
    });
    jar.setFromHeaders(initialRes.headers);
    const initialHtml = await initialRes.text();

    const nonceMatch =
      initialHtml.match(/name=['"]woocommerce-login-nonce['"][^>]*value=['"]([^'"]+)['"]/i) ||
      initialHtml.match(/value=['"]([^'"]+)['"][^>]*name=['"]woocommerce-login-nonce['"]/i);
    const nonce = nonceMatch ? nonceMatch[1] : '';

    const refererMatch =
      initialHtml.match(/name=['"]_wp_http_referer['"][^>]*value=['"]([^'"]+)['"]/i) ||
      initialHtml.match(/value=['"]([^'"]+)['"][^>]*name=['"]_wp_http_referer['"]/i);
    const wpReferer = refererMatch ? refererMatch[1] : '/';

    if (nonce) {
      const form = new URLSearchParams();
      form.append('username', wpProfile.username || cleanUser);
      form.append('password', password);
      form.append('woocommerce-login-nonce', nonce);
      form.append('_wp_http_referer', wpReferer);
      form.append('login', 'Log in');

      // Intercept Set-Cookie headers from the 302 response
      const loginRes = await fetch(`${TARGET_HOST}/my-account/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': jar.getCookieHeader(),
          'User-Agent': BROWSER_UA,
          'Referer': `${TARGET_HOST}/my-account/`,
          'Origin': TARGET_HOST,
        },
        body: form.toString(),
        redirect: 'manual',
      });

      jar.setFromHeaders(loginRes.headers);

      // Follow redirect to dashboard to accumulate any final session cookies
      const redirectLocation = loginRes.headers.get('location') || '/my-account/';
      const targetUrl = redirectLocation.startsWith('http') ? redirectLocation : `${TARGET_HOST}${redirectLocation}`;
      const dashboardRes = await fetch(targetUrl, {
        headers: {
          'Cookie': jar.getCookieHeader(),
          'User-Agent': BROWSER_UA,
        },
      });
      jar.setFromHeaders(dashboardRes.headers);

      // ── Step 3a: Scrape Account Details (First/Last Name, Email) ───────
      try {
        const editRes = await fetch(`${TARGET_HOST}/my-account/edit-account/`, {
          headers: { 'Cookie': jar.getCookieHeader(), 'User-Agent': BROWSER_UA },
        });
        if (editRes.ok) {
          const editHtml = await editRes.text();
          const getField = (name) => {
            const m = editHtml.match(new RegExp(`name=['"]${name}['"][^>]*value=['"]([^'"]*)['"]`, 'i')) ||
                      editHtml.match(new RegExp(`value=['"]([^'"]*)['"][^>]*name=['"]${name}['"]`, 'i'));
            return m ? m[1].trim() : '';
          };
          const accFirst = getField('account_first_name');
          const accLast = getField('account_last_name');
          const accDisplay = getField('account_display_name');
          const accEmail = getField('account_email');

          if (accDisplay) displayName = accDisplay;
          if (accFirst) firstName = accFirst;
          if (accLast) lastName = accLast;
          if (accEmail) email = accEmail;
        }
      } catch (editErr) {
        console.warn('Account details scrape skipped:', editErr.message);
      }

      // ── Step 3b: Scrape Billing Phone & Company ────────────────────────
      try {
        const billingRes = await fetch(`${TARGET_HOST}/my-account/edit-address/billing/`, {
          headers: { 'Cookie': jar.getCookieHeader(), 'User-Agent': BROWSER_UA },
        });
        if (billingRes.ok) {
          const billHtml = await billingRes.text();
          const getField = (name) => {
            const m = billHtml.match(new RegExp(`name=['"]${name}['"][^>]*value=['"]([^'"]*)['"]`, 'i')) ||
                      billHtml.match(new RegExp(`value=['"]([^'"]*)['"][^>]*name=['"]${name}['"]`, 'i'));
            return m ? m[1].trim() : '';
          };
          const billPhone = getField('billing_phone');
          const billComp = getField('billing_company');
          if (billPhone) phone = billPhone;
          if (billComp) company = billComp;
        }
      } catch (billErr) {
        console.warn('Billing address scrape skipped:', billErr.message);
      }

      // ── Step 3c: Scrape Live WooWallet Balance & Transaction History ────
      try {
        const walletRes = await fetch(`${TARGET_HOST}/my-account/woo-wallet/`, {
          headers: { 'Cookie': jar.getCookieHeader(), 'User-Agent': BROWSER_UA },
        });
        if (walletRes.ok) {
          const walletHtml = await walletRes.text();
          const balDiv =
            walletHtml.match(/class="[^"]*woo-wallet-my-wallet-balance[^"]*"[\s\S]*?<\/div>/i) ||
            walletHtml.match(/class="[^"]*woo-wallet-balance-amount[^"]*"[\s\S]*?<\/span>/i) ||
            walletHtml.match(/Current balance:?[\s\S]*?<\/div>/i) ||
            walletHtml.match(/Current balance:?[\s\S]*?<\/p>/i);

          if (balDiv) {
            const p = extractPrice(balDiv[0]);
            if (!isNaN(p)) {
              walletBalance = p;
              foundRealBalance = true;
            }
          }

          if (!foundRealBalance) {
            const amountMatch = walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"[\s\S]*?<\/span>/i);
            if (amountMatch) {
              const p = extractPrice(amountMatch[0]);
              if (!isNaN(p)) {
                walletBalance = p;
                foundRealBalance = true;
              }
            }
          }

          // Parse transaction rows from transaction table
          const txTableMatch = walletHtml.match(/<table[^>]*class="[^"]*woo-wallet-transaction-table[^"]*"[\s\S]*?<\/table>/i);
          const txHtml = txTableMatch ? txTableMatch[0] : walletHtml;
          const txRows = txHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

          for (const row of txRows) {
            if (row.includes('<th')) continue;

            const descMatch = row.match(/class="[^"]*details[^"]*"[^>]*>([\s\S]*?)<\/td>/i) ||
                              row.match(/data-title="Details"[^>]*>([\s\S]*?)<\/td>/i);
            const dateMatch = row.match(/class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/td>/i) ||
                              row.match(/data-title="Date"[^>]*>([\s\S]*?)<\/td>/i);
            const creditMatch = row.match(/class="[^"]*credit[^"]*"[^>]*>([\s\S]*?)<\/td>/i) ||
                                row.match(/data-title="Credit"[^>]*>([\s\S]*?)<\/td>/i);
            const debitMatch = row.match(/class="[^"]*debit[^"]*"[^>]*>([\s\S]*?)<\/td>/i) ||
                               row.match(/data-title="Debit"[^>]*>([\s\S]*?)<\/td>/i);

            const creditAmt = creditMatch ? extractPrice(creditMatch[1]) : 0;
            const debitAmt = debitMatch ? extractPrice(debitMatch[1]) : 0;
            const isCredit = creditAmt > 0;
            const amt = isCredit ? creditAmt : debitAmt;

            if (amt > 0 || descMatch) {
              const cleanDesc = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : 'Cafeteria Transaction';
              const cleanDate = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, '').trim() : '';
              transactions.push({
                id: `tx-${transactions.length + 1}-${Date.now()}`,
                amount: amt,
                date: cleanDate,
                type: isCredit ? 'credit' : 'debit',
                details: cleanDesc,
              });
            }
          }
        }
      } catch (wErr) {
        console.warn('WooWallet scrape skipped:', wErr.message);
      }

      // ── Step 3d: Scrape Past Orders from WooCommerce ───────────────────
      try {
        const ordersRes = await fetch(`${TARGET_HOST}/my-account/orders/`, {
          headers: { 'Cookie': jar.getCookieHeader(), 'User-Agent': BROWSER_UA },
        });
        if (ordersRes.ok) {
          const ordersHtml = await ordersRes.text();
          const orderRows = ordersHtml.match(/<tr[^>]*class="[^"]*woocommerce-orders-table__row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi) || [];

          for (const row of orderRows) {
            const numMatch = row.match(/href="[^"]*\/view-order\/(\d+)\/?"[^>]*>[\s\S]*?#?(\d+)/i) ||
                             row.match(/data-title="Order"[^>]*>[\s\S]*?#?(\d+)/i);
            const orderId = numMatch ? numMatch[1] : '';
            const orderNumber = numMatch ? (numMatch[2] || numMatch[1]) : '';

            const dateMatch = row.match(/<time[^>]*>([^<]+)<\/time>/i) ||
                              row.match(/data-title="Date"[^>]*>[\s\S]*?<time[^>]*>([^<]+)<\/time>/i);
            const datePlaced = dateMatch ? dateMatch[1].trim() : '';

            const statusMatch = row.match(/data-title="Status"[^>]*>\s*([^<\n]+)/i);
            const status = statusMatch ? statusMatch[1].trim() : 'Completed';

            const total = extractPrice(row);

            if (orderId && !orders.some(o => String(o.id) === String(orderId))) {
              orders.push({
                id: orderId,
                orderNumber: String(orderNumber || orderId),
                datePlaced,
                deliveryDate: datePlaced,
                status,
                total,
                customerNote: '',
                mealDate: datePlaced,
                paymentMethod: 'Cafeteria Allowance',
                items: [{
                  id: 1,
                  name: 'Cafeteria Meal Order',
                  price: total,
                  quantity: 1,
                  mealDate: datePlaced,
                }],
              });
            }
          }

          // For the top 5 most recent orders, fetch exact line item names
          const recentOrders = orders.slice(0, 5);
          for (const ord of recentOrders) {
            try {
              const viewRes = await fetch(`${TARGET_HOST}/my-account/view-order/${ord.id}/`, {
                headers: { 'Cookie': jar.getCookieHeader(), 'User-Agent': BROWSER_UA },
              });
              if (viewRes.ok) {
                const viewHtml = await viewRes.text();
                const itemRows = viewHtml.match(/<tr[^>]*class="[^"]*woocommerce-table__line-item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                if (itemRows.length > 0) {
                  const detailedItems = [];
                  for (const iRow of itemRows) {
                    const nameM = iRow.match(/class="[^"]*product-name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                                  iRow.match(/class="[^"]*product-name[^"]*"[^>]*>\s*([^<\n]+)/i);
                    const qtyM = iRow.match(/class="[^"]*product-quantity[^"]*"[^>]*>[\s\S]*?(\d+)/i) ||
                                 iRow.match(/&times;\s*(\d+)/i);
                    const p = extractPrice(iRow);
                    detailedItems.push({
                      id: Math.floor(Math.random() * 100000),
                      name: nameM ? nameM[1].trim() : 'Meal Item',
                      price: p,
                      quantity: qtyM ? parseInt(qtyM[1], 10) : 1,
                      mealDate: ord.datePlaced,
                    });
                  }
                  if (detailedItems.length > 0) {
                    ord.items = detailedItems;
                  }
                }
              }
            } catch {}
          }
        }
      } catch (oErr) {
        console.warn('WooCommerce orders scrape skipped:', oErr.message);
      }
    }
  } catch (wooErr) {
    console.warn('WooCommerce session login skipped:', wooErr.message);
  }

  // ── Step 4: Query KPOM & Calendar Pre-Orders (All Candidate IDs) ───────

  const candidateIds = Array.from(new Set([
    cleanUser,
    wpProfile.user_id,
    numericId,
    wpProfile.username,
  ].filter(Boolean)));

  for (const cid of candidateIds) {
    try {
      const kpomRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/kpom/get-user-order-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cid }),
      });
      if (kpomRes.ok) {
        const kpomData = await kpomRes.json();
        const items = kpomData?.mealplan_order_items_data?.order_items;
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            const ordId = item.order_id || `kpom-${item.order_number || Date.now()}`;
            if (!orders.some(o => String(o.id) === String(ordId))) {
              orders.push({
                id: ordId,
                orderNumber: String(item.order_number || ordId),
                datePlaced: item.order_date || item.delivery_date || '',
                deliveryDate: item.delivery_date || '',
                status: item.status || 'Completed',
                total: parseFloat(item.price || item.total || '0') || 0,
                customerNote: item.note || '',
                mealDate: item.delivery_date || '',
                paymentMethod: 'Cafeteria Allowance',
                items: [{
                  id: item.product_id || 1,
                  name: item.product_name || item.item_name || 'Meal Order',
                  price: parseFloat(item.price || '0') || 0,
                  quantity: item.quantity || 1,
                  mealDate: item.delivery_date || '',
                }],
              });
            }
          }
          break;
        }
      }
    } catch {}
  }

  for (const cid of candidateIds) {
    try {
      const calRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/konbini-order-calendar/get-user-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cid }),
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        if (Array.isArray(calData?.data) && calData.data.length > 0) {
          for (const ord of calData.data) {
            const ordId = ord.order_id || ord.id;
            if (ordId && !orders.some(o => String(o.id) === String(ordId))) {
              orders.push({
                id: ordId,
                orderNumber: String(ord.order_number || ordId),
                datePlaced: ord.date || '',
                deliveryDate: ord.date || '',
                status: 'Completed',
                total: parseFloat(ord.total || '0') || 0,
                items: [],
                paymentMethod: 'Cafeteria Allowance',
              });
            }
          }
          break;
        }
      }
    } catch {}
  }

  console.log(`✅ Full profile authenticated: ${displayName} (${cleanUser}), Email: ${email}, Phone: ${phone || 'N/A'}, Wallet: $${walletBalance.toFixed(2)}, Orders: ${orders.length}`);

  return res.json({
    success: true,
    session: {
      isLoggedIn: true,
      userId: wpProfile.user_id || numericId,
      username: cleanUser,
      displayName,
      email,
      phone,
      company,
      firstName,
      lastName,
      walletBalance,
      walletTransactions: transactions,
      orders,
    },
  });
});

// ─────────────────────────────────────────────
// POST /api/user-data — Live refresh without password
// ─────────────────────────────────────────────

app.post('/api/user-data', async (req, res) => {
  const { username } = req.body || {};
  const cleanUser = (username || '').trim();
  if (!cleanUser) {
    return res.status(400).json({ success: false, error: 'Username is required.' });
  }

  const numericId = cleanUser.replace(/^SIP/i, '');
  const upperUser = cleanUser.toUpperCase();

  let displayName = upperUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${numericId}` : upperUser;
  let firstName = '';
  let lastName = '';
  let email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
  let company = 'Shimano (Singapore) Pte Ltd';
  let userId = numericId;
  const orders = [];

  // Query staff directory
  try {
    const dirRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/asset_management/get-user-list`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (dirRes.ok) {
      const dirData = await dirRes.json();
      if (Array.isArray(dirData?.users)) {
        const matched =
          dirData.users.find(u => String(u.id) === cleanUser || String(u.id) === numericId) ||
          dirData.users.find(u => u.display_name.toUpperCase().includes(upperUser));
        if (matched) {
          if (matched.display_name) {
            displayName = matched.display_name;
            const parts = displayName.split(' ');
            firstName = parts[0] || displayName;
            lastName = parts.slice(1).join(' ') || '';
          }
          if (matched.id) userId = String(matched.id);
        }
      }
    }
  } catch {}

  // Query KPOM
  const candidateIds = Array.from(new Set([cleanUser, numericId, userId].filter(Boolean)));
  for (const cid of candidateIds) {
    try {
      const kpomRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/kpom/get-user-order-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cid }),
      });
      if (kpomRes.ok) {
        const kpomData = await kpomRes.json();
        const items = kpomData?.mealplan_order_items_data?.order_items;
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            const ordId = item.order_id || `kpom-${item.order_number || Date.now()}`;
            if (!orders.some(o => String(o.id) === String(ordId))) {
              orders.push({
                id: ordId,
                orderNumber: String(item.order_number || ordId),
                datePlaced: item.order_date || item.delivery_date || '',
                deliveryDate: item.delivery_date || '',
                status: item.status || 'Completed',
                total: parseFloat(item.price || item.total || '0') || 0,
                customerNote: item.note || '',
                mealDate: item.delivery_date || '',
                paymentMethod: 'Cafeteria Allowance',
                items: [{
                  id: item.product_id || 1,
                  name: item.product_name || item.item_name || 'Meal Order',
                  price: parseFloat(item.price || '0') || 0,
                  quantity: item.quantity || 1,
                  mealDate: item.delivery_date || '',
                }],
              });
            }
          }
          break;
        }
      }
    } catch {}
  }

  // Query Konbini Calendar
  for (const cid of candidateIds) {
    try {
      const calRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/konbini-order-calendar/get-user-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cid }),
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        if (Array.isArray(calData?.data) && calData.data.length > 0) {
          for (const ord of calData.data) {
            const ordId = ord.order_id || ord.id;
            if (ordId && !orders.some(o => String(o.id) === String(ordId))) {
              orders.push({
                id: ordId,
                orderNumber: String(ord.order_number || ordId),
                datePlaced: ord.date || '',
                deliveryDate: ord.date || '',
                status: 'Completed',
                total: parseFloat(ord.total || '0') || 0,
                items: [],
                paymentMethod: 'Cafeteria Allowance',
              });
            }
          }
          break;
        }
      }
    } catch {}
  }

  return res.json({
    success: true,
    data: {
      username: cleanUser,
      userId,
      displayName,
      firstName,
      lastName,
      email,
      company,
      orders,
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SSIP Cafeteria Auth Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
  console.log(`   Auth:   POST http://localhost:${PORT}/api/auth`);
});
