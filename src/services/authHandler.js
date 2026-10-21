const TARGET_HOST = 'https://ssip-cafeteria.whew.life';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

export async function handleCafeteriaAuth(username, password) {
  const cleanUser = (username || '').trim();
  if (!cleanUser || !password) {
    return { status: 400, data: { error: 'Please enter both username and password.' } };
  }

  try {
    // 1. Direct Credential Validation against WordPress Core XML-RPC wp.getProfile
    const xmlPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getProfile</methodName>
  <params>
    <param><value><int>1</int></value></param>
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

    // 2. Parse Authentic Profile
    const wpProfile = parseXmlStruct(xmlText);
    const upperUser = cleanUser.toUpperCase();
    const numericId = cleanUser.replace(/^SIP/i, '');

    let displayName = wpProfile.display_name || (upperUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${numericId}` : upperUser);
    let firstName = wpProfile.first_name || (displayName ? displayName.split(' ')[0] : upperUser);
    let lastName = wpProfile.last_name || (displayName ? displayName.split(' ').slice(1).join(' ') : '');
    let email = wpProfile.email || `${cleanUser.toLowerCase()}@shimano.com.sg`;
    let walletBalance = 100.0;
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
          let matched =
            (wpProfile.user_id && dirData.users.find(u => u.id === wpProfile.user_id)) ||
            dirData.users.find(u => u.id === cleanUser || u.id === numericId) ||
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
      console.warn('Could not query staff directory', e);
    }

    // 3. Attempt WooCommerce session login for live wallet & orders
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

        // Fetch woo-wallet balance & transactions
        const walletRes = await fetch(`${TARGET_HOST}/my-account/woo-wallet/`, {
          headers: { 'Cookie': authCookies, 'User-Agent': BROWSER_UA },
        });
        if (walletRes.ok) {
          const walletHtml = await walletRes.text();
          const balMatch =
            walletHtml.match(/Current balance:?\s*<[^>]*>[\s\S]*?([\d\.]+)/i) ||
            walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi>(?:<span[^>]*>[^<]*<\/span>)?\s*([\d\.]+)/i) ||
            walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi><span[^>]*>[^<]*<\/span>([\d\.]+)/i);
          if (balMatch) {
            const val = parseFloat(balMatch[1]);
            if (!isNaN(val)) walletBalance = val;
          }

          const txRows = walletHtml.match(/<tr[^>]*class="[^"]*woo-wallet-transaction-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi) || [];
          for (const row of txRows) {
            const amountMatch = row.match(/class="[^"]*amount[^"]*"[^>]*>[\s\S]*?([\d\.]+)/i);
            const dateMatch = row.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)/i);
            const typeMatch = row.match(/class="[^"]*type[^"]*"[^>]*>([^<]+)/i);
            const descMatch = row.match(/class="[^"]*description[^"]*"[^>]*>([^<]+)/i);
            if (amountMatch) {
              transactions.push({
                id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                amount: parseFloat(amountMatch[1]) || 0,
                date: (dateMatch ? dateMatch[1] : '').trim(),
                type: (typeMatch ? typeMatch[1] : 'debit').trim().toLowerCase(),
                details: (descMatch ? descMatch[1] : 'Cafeteria Transaction').trim(),
              });
            }
          }
        }

        // Fetch past orders from WooCommerce
        const ordersRes = await fetch(`${TARGET_HOST}/my-account/orders/`, {
          headers: { 'Cookie': authCookies, 'User-Agent': BROWSER_UA },
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
            const totalMatch = row.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi>(?:<span[^>]*>[^<]*<\/span>)?\s*([\d\.]+)/i) ||
                               row.match(/<\/span>\s*([\d\.]+)/i);
            const total = totalMatch ? parseFloat(totalMatch[1]) : 0;

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
        }
      }
    } catch (e) {
      console.warn('WooCommerce scrape skipped', e);
    }

    // 4. Fetch meal pre-orders from KPOM & Calendar
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
