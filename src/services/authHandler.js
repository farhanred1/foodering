const TARGET_HOST = 'https://ssip-cafeteria.whew.life';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function handleCafeteriaAuth(username, password) {
  const cleanUser = (username || '').trim();
  if (!cleanUser || !password) {
    return { status: 400, data: { error: 'Please enter both username and password.' } };
  }

  try {
    // 1. Direct Credential Validation against WordPress Core XML-RPC API
    const xmlPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getUsersBlogs</methodName>
  <params>
    <param><value><string>${escapeXml(cleanUser)}</string></value></param>
    <param><value><string>${escapeXml(password)}</string></value></param>
  </params>
</methodCall>`;

    const xmlRes = await fetch(`${TARGET_HOST}/xmlrpc.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'User-Agent': BROWSER_UA,
      },
      body: xmlPayload,
    });

    const xmlText = await xmlRes.text();

    if (xmlRes.status !== 200 || !xmlText.includes('<methodResponse>')) {
      return {
        status: 502,
        data: {
          success: false,
          error: `Unable to connect to cafeteria server for authentication (HTTP ${xmlRes.status}).`
        }
      };
    }

    if (xmlText.includes('<fault>')) {
      const faultMatch = xmlText.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]+)<\/string>/i);
      const faultMsg = faultMatch
        ? faultMatch[1].trim()
        : 'Incorrect username or password. Please verify your staff credentials.';
      return { status: 401, data: { success: false, error: faultMsg } };
    }

    if (!xmlText.includes('<params>')) {
      return {
        status: 401,
        data: { success: false, error: 'Authentication failed. Please check your staff ID and password.' }
      };
    }

    // 2. Staff is authenticated! Now retrieve authentic profile & orders
    const upperUser = cleanUser.toUpperCase();
    let displayName = upperUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${upperUser.replace(/^SIP/i, '')}` : upperUser;
    let firstName = upperUser;
    let lastName = '';
    let email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
    let walletBalance = 0.0;
    const orders = [];
    const transactions = [];

    // Query official staff directory for employee's full legal name
    try {
      const dirRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/asset_management/get-user-list`, {
        headers: { 'User-Agent': BROWSER_UA },
      });
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        if (Array.isArray(dirData?.users)) {
          const cleanNum = upperUser.replace(/^SIP/i, '');
          let matched = dirData.users.find(u => u.id === upperUser || u.id === cleanNum);
          if (!matched) {
            matched = dirData.users.find(u =>
              u.display_name.toUpperCase().includes(upperUser) ||
              upperUser.includes(u.display_name.toUpperCase())
            );
          }
          if (matched && matched.display_name) {
            displayName = matched.display_name;
            const parts = displayName.split(' ');
            firstName = parts[0] || displayName;
            lastName = parts.slice(1).join(' ') || '';
          }
        }
      }
    } catch (e) {
      console.warn('Could not query staff directory', e);
    }

    // Attempt to query WooCommerce session for wallet balance if available
    try {
      const initialRes = await fetch(`${TARGET_HOST}/my-account/`, {
        headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html,application/xhtml+xml' },
      });
      const initialHtml = await initialRes.text();
      const nonceMatch =
        initialHtml.match(/name=['"]woocommerce-login-nonce['"][^>]*value=['"]([^'"]+)['"]/i) ||
        initialHtml.match(/value=['"]([^'"]+)['"][^>]*name=['"]woocommerce-login-nonce['"]/i);
      const nonce = nonceMatch ? nonceMatch[1] : '';

      let cookies = '';
      if (typeof initialRes.headers.getSetCookie === 'function') {
        cookies = initialRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      } else {
        const raw = initialRes.headers.get('set-cookie');
        if (raw) cookies = raw.split(';')[0];
      }

      if (nonce) {
        const form = new URLSearchParams();
        form.append('username', cleanUser);
        form.append('password', password);
        form.append('woocommerce-login-nonce', nonce);
        form.append('_wp_http_referer', '/my-account/');
        form.append('login', 'Log in');

        const loginRes = await fetch(`${TARGET_HOST}/my-account/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies,
            'User-Agent': BROWSER_UA,
            'Referer': `${TARGET_HOST}/my-account/`,
          },
          body: form.toString(),
          redirect: 'follow',
        });

        let authCookies = cookies;
        if (typeof loginRes.headers.getSetCookie === 'function') {
          const newCookies = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
          if (newCookies) authCookies = `${authCookies}; ${newCookies}`;
        } else {
          const raw = loginRes.headers.get('set-cookie');
          if (raw) authCookies = `${authCookies}; ${raw.split(';')[0]}`;
        }

        // Fetch woo-wallet balance
        const walletRes = await fetch(`${TARGET_HOST}/my-account/woo-wallet/`, {
          headers: { 'Cookie': authCookies, 'User-Agent': BROWSER_UA },
        });
        if (walletRes.ok) {
          const walletHtml = await walletRes.text();
          const balMatch =
            walletHtml.match(/Current balance:?\s*<[^>]*>[\s\S]*?([\d\.]+)/i) ||
            walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi><span[^>]*>[^<]*<\/span>([\d\.]+)/i);
          if (balMatch) {
            const val = parseFloat(balMatch[1]);
            if (!isNaN(val)) walletBalance = val;
          }
        }
      }
    } catch (e) {
      console.warn('WooCommerce wallet scrape skipped', e);
    }

    // Fetch live KPOM meal orders
    try {
      const kpomRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/kpom/get-user-order-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cleanUser }),
      });
      if (kpomRes.ok) {
        const kpomData = await kpomRes.json();
        const items = kpomData?.mealplan_order_items_data?.order_items;
        if (Array.isArray(items)) {
          for (const item of items) {
            orders.push({
              id: item.order_id || Math.floor(Math.random() * 100000),
              orderNumber: String(item.order_number || item.order_id || ''),
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
      }
    } catch (e) {
      console.warn('Could not fetch KPOM user orders', e);
    }

    // Fetch calendar orders
    try {
      const calRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/konbini-order-calendar/get-user-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
        body: JSON.stringify({ username: cleanUser }),
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        if (Array.isArray(calData?.data)) {
          for (const ord of calData.data) {
            const ordId = ord.order_id || ord.id;
            if (ordId && !orders.some(o => o.id === ordId)) {
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
        }
      }
    } catch (e) {
      console.warn('Could not fetch calendar orders', e);
    }

    return {
      status: 200,
      data: {
        success: true,
        session: {
          isLoggedIn: true,
          username: upperUser,
          displayName,
          email,
          phone: '',
          firstName,
          lastName,
          walletBalance,
          walletTransactions: transactions,
          orders,
        },
      },
    };
  } catch (err) {
    return {
      status: 500,
      data: { error: 'Authentication service error: ' + (err.message || 'Unknown error') },
    };
  }
}
