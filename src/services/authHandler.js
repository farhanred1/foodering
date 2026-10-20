const TARGET_HOST = 'https://ssip-cafeteria.whew.life';

export async function handleCafeteriaAuth(username, password) {
  const cleanUser = (username || '').trim();
  if (!cleanUser || !password) {
    return { status: 400, data: { error: 'Please enter both username and password.' } };
  }

  try {
    // Step A: Fetch login nonce and cookies
    const initialRes = await fetch(`${TARGET_HOST}/my-account/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FooderingAuth/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const initialHtml = await initialRes.text();
    const nonceMatch = initialHtml.match(/name=['"]woocommerce-login-nonce['"][^>]*value=['"]([^'"]+)['"]/i);
    const nonce = nonceMatch ? nonceMatch[1] : '';

    let cookies = '';
    if (typeof initialRes.headers.getSetCookie === 'function') {
      cookies = initialRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    } else {
      const rawCookie = initialRes.headers.get('set-cookie');
      if (rawCookie) cookies = rawCookie.split(';')[0];
    }

    if (!nonce) {
      return { status: 502, data: { error: 'Could not obtain cafeteria login security token.' } };
    }

    // Step B: Submit login form
    const formData = new URLSearchParams();
    formData.append('username', cleanUser);
    formData.append('password', password);
    formData.append('woocommerce-login-nonce', nonce);
    formData.append('_wp_http_referer', '/my-account/');
    formData.append('login', 'Log in');

    const loginRes = await fetch(`${TARGET_HOST}/my-account/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FooderingAuth/1.0',
        'Referer': `${TARGET_HOST}/my-account/`,
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    let authCookies = cookies;
    if (typeof loginRes.headers.getSetCookie === 'function') {
      const newCookies = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      if (newCookies) authCookies = `${authCookies}; ${newCookies}`;
    } else {
      const raw = loginRes.headers.get('set-cookie');
      if (raw) authCookies = `${authCookies}; ${raw.split(';')[0]}`;
    }

    const isAuthSuccess = authCookies.includes('wordpress_logged_in') || loginRes.status === 302;
    const loginHtml = await loginRes.text();

    const isError =
      loginHtml.includes('woocommerce-error') ||
      loginHtml.includes('The password you entered') ||
      loginHtml.includes('Unknown username') ||
      loginHtml.includes('is incorrect') ||
      loginHtml.includes('Incorrect username or password');

    if (!isAuthSuccess || isError) {
      const errMatch = loginHtml.match(/<ul class="woocommerce-error[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
      let cleanMsg = errMatch
        ? errMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
      if (!cleanMsg || cleanMsg.length < 5) {
        cleanMsg = 'Incorrect username or password. Please verify your credentials.';
      }
      return { status: 401, data: { success: false, error: cleanMsg } };
    }

    // Authenticated! Fetch details
    const upperUser = cleanUser.toUpperCase();
    let displayName = upperUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${upperUser.replace(/^SIP/i, '')}` : upperUser;
    let firstName = upperUser;
    let lastName = '';
    let email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
    let walletBalance = 100.0;
    const orders = [];
    const transactions = [];

    // 1. /my-account/
    try {
      const accRes = await fetch(`${TARGET_HOST}/my-account/`, {
        headers: { 'Cookie': authCookies, 'User-Agent': 'Mozilla/5.0 FooderingAuth/1.0' },
      });
      if (accRes.ok) {
        const accHtml = await accRes.text();
        const greeting = accHtml.match(/Hello\s+<strong>([^<]+)<\/strong>/i) ||
                         accHtml.match(/<strong>([^<]+)<\/strong>\s*\(not/i);
        if (greeting && greeting[1]) {
          displayName = greeting[1].trim();
          const parts = displayName.split(' ');
          firstName = parts[0] || displayName;
          lastName = parts.slice(1).join(' ') || '';
        }
      }
    } catch (e) {}

    // 2. /my-account/edit-account/
    try {
      const editRes = await fetch(`${TARGET_HOST}/my-account/edit-account/`, {
        headers: { 'Cookie': authCookies, 'User-Agent': 'Mozilla/5.0 FooderingAuth/1.0' },
      });
      if (editRes.ok) {
        const editHtml = await editRes.text();
        const fnMatch = editHtml.match(/name="account_first_name"[^>]*value="([^"]*)"/i);
        const lnMatch = editHtml.match(/name="account_last_name"[^>]*value="([^"]*)"/i);
        const emMatch = editHtml.match(/name="account_email"[^>]*value="([^"]*)"/i);
        if (fnMatch && fnMatch[1]) firstName = fnMatch[1].trim();
        if (lnMatch && lnMatch[1]) lastName = lnMatch[1].trim();
        if (emMatch && emMatch[1]) email = emMatch[1].trim();
        if (firstName || lastName) {
          displayName = `${firstName} ${lastName}`.trim();
        }
      }
    } catch (e) {}

    // 3. /my-account/woo-wallet/
    try {
      const walletRes = await fetch(`${TARGET_HOST}/my-account/woo-wallet/`, {
        headers: { 'Cookie': authCookies, 'User-Agent': 'Mozilla/5.0 FooderingAuth/1.0' },
      });
      if (walletRes.ok) {
        const walletHtml = await walletRes.text();
        const balMatch = walletHtml.match(/Current balance:?\s*<[^>]*>[\s\S]*?([\d\.]+)/i) ||
                         walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi><span[^>]*>[^<]*<\/span>([\d\.]+)/i);
        if (balMatch) {
          const val = parseFloat(balMatch[1]);
          if (!isNaN(val)) walletBalance = val;
        }

        const txRows = [...walletHtml.matchAll(/<tr[^>]*class="[^"]*woocommerce-wallet-history-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)];
        for (const row of txRows) {
          const cols = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim());
          if (cols.length >= 4) {
            const [id, date, amountStr, details] = cols;
            const amountVal = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
            const isCredit = /credit/i.test(row[1]) || /credit/i.test(details);
            transactions.push({
              id: id || `tx-${Math.random()}`,
              date: date || '',
              amount: amountVal,
              type: isCredit ? 'credit' : 'debit',
              details: details || 'Cafeteria Transaction',
            });
          }
        }
      }
    } catch (e) {}

    // 4. KPOM orders
    try {
      const kpomRes = await fetch(`${TARGET_HOST}/wp-json/wp/v2/kpom/get-user-order-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (e) {}

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
    return { status: 500, data: { error: 'Authentication service error: ' + (err.message || 'Unknown error') } };
  }
}
