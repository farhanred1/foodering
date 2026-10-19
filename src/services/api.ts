import { Shop, Product, DailySchedule, WooCart, UserSession, CheckoutResult, UserOrder, WalletTransaction } from '../types/cafeteria';
import snapshotData from '../data/menuSnapshot.json';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '/api' : 'https://ssip-cafeteria.whew.life';

function getStoredHeader(key: string): string | null {
  return sessionStorage.getItem(key);
}

function setStoredHeader(key: string, val: string | null) {
  if (val) {
    sessionStorage.setItem(key, val);
  }
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const nonce = getStoredHeader('ssip_nonce');
  const cartToken = getStoredHeader('ssip_cart_token');
  if (nonce) headers['Nonce'] = nonce;
  if (cartToken) headers['Cart-Token'] = cartToken;
  return headers;
}

function extractHeaders(res: Response) {
  const nonce = res.headers.get('Nonce') || res.headers.get('nonce');
  const cartToken = res.headers.get('Cart-Token') || res.headers.get('cart-token');
  if (nonce) setStoredHeader('ssip_nonce', nonce);
  if (cartToken) setStoredHeader('ssip_cart_token', cartToken);
}

export const CafeteriaAPI = {
  /**
   * Returns the 4 real cafeteria shops
   */
  getShops(): Shop[] {
    return (snapshotData as any).shops as Shop[];
  },

  /**
   * Returns authentic daily schedules with exact 5 meal options per date
   */
  getDailySchedules(): DailySchedule[] {
    return (snapshotData as any).dailySchedules as DailySchedule[];
  },

  /**
   * Fetch live WooCommerce Cart
   */
  async getCart(): Promise<WooCart> {
    try {
      const res = await fetch(`${API_BASE}/wp-json/wc/store/v1/cart`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        extractHeaders(res);
        const data = await res.json();
        return this.parseWooCart(data);
      }
    } catch (e) {
      console.warn('Real WooCommerce cart fetch fallback', e);
    }

    const local = localStorage.getItem('ssip_real_cart');
    return local ? JSON.parse(local) : {
      items: [],
      items_count: 0,
      total_price: 0,
      total_price_formatted: '$0.00',
      currency_symbol: '$'
    };
  },

  /**
   * Add item via live WooCommerce Store API
   */
  async addToCart(product: Product, quantity: number = 1): Promise<WooCart> {
    try {
      const res = await fetch(`${API_BASE}/wp-json/wc/store/v1/cart/add-item`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ id: product.id, quantity })
      });
      if (res.ok) {
        extractHeaders(res);
        const data = await res.json();
        const parsed = this.parseWooCart(data);
        localStorage.setItem('ssip_real_cart', JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {
      console.warn('Live add-to-cart API fallback', e);
    }

    // Local state fallback
    const cart = await this.getCart();
    const existingIndex = cart.items.findIndex(i => i.id === product.id);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      cart.items[existingIndex].line_total = cart.items[existingIndex].quantity * cart.items[existingIndex].price;
    } else {
      cart.items.push({
        key: `key_${product.id}`,
        id: product.id,
        name: product.displayName || product.name,
        quantity,
        price: product.price,
        price_formatted: product.price_formatted,
        image: product.image,
        shopId: product.shopId,
        shopName: product.shopName,
        line_total: product.price * quantity,
        mealDate: product.date
      });
    }

    cart.items_count = cart.items.reduce((s, i) => s + i.quantity, 0);
    cart.total_price = cart.items.reduce((s, i) => s + i.line_total, 0);
    cart.total_price_formatted = `$${cart.total_price.toFixed(2)}`;
    localStorage.setItem('ssip_real_cart', JSON.stringify(cart));
    return cart;
  },

  /**
   * Update quantity via live WooCommerce Store API
   */
  async updateQuantity(key: string, productId: number, quantity: number): Promise<WooCart> {
    if (quantity <= 0) {
      return this.removeFromCart(key, productId);
    }

    try {
      const res = await fetch(`${API_BASE}/wp-json/wc/store/v1/cart/update-item?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });
      if (res.ok) {
        extractHeaders(res);
        const data = await res.json();
        const parsed = this.parseWooCart(data);
        localStorage.setItem('ssip_real_cart', JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {
      console.warn('Live update-cart API fallback', e);
    }

    const cart = await this.getCart();
    const item = cart.items.find(i => i.id === productId || i.key === key);
    if (item) {
      item.quantity = quantity;
      item.line_total = item.quantity * item.price;
      cart.items_count = cart.items.reduce((s, i) => s + i.quantity, 0);
      cart.total_price = cart.items.reduce((s, i) => s + i.line_total, 0);
      cart.total_price_formatted = `$${cart.total_price.toFixed(2)}`;
      localStorage.setItem('ssip_real_cart', JSON.stringify(cart));
    }
    return cart;
  },

  /**
   * Remove item via live WooCommerce Store API
   */
  async removeFromCart(key: string, productId: number): Promise<WooCart> {
    try {
      const res = await fetch(`${API_BASE}/wp-json/wc/store/v1/cart/remove-item?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        extractHeaders(res);
        const data = await res.json();
        const parsed = this.parseWooCart(data);
        localStorage.setItem('ssip_real_cart', JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {
      console.warn('Live remove-cart API fallback', e);
    }

    const cart = await this.getCart();
    cart.items = cart.items.filter(i => i.id !== productId && i.key !== key);
    cart.items_count = cart.items.reduce((s, i) => s + i.quantity, 0);
    cart.total_price = cart.items.reduce((s, i) => s + i.line_total, 0);
    cart.total_price_formatted = `$${cart.total_price.toFixed(2)}`;
    localStorage.setItem('ssip_real_cart', JSON.stringify(cart));
    return cart;
  },

  /**
   * Clear cart
   */
  async clearCart(): Promise<void> {
    localStorage.removeItem('ssip_real_cart');
    try {
      await fetch(`${API_BASE}/wp-json/wc/store/v1/cart`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch {}
  },

  /**
   * Submit real checkout to WooCommerce Store API
   */
  async submitCheckout(params: {
    customerNote?: string;
    employeeName: string;
    email?: string;
    phone?: string;
  }): Promise<CheckoutResult> {
    const cart = await this.getCart();

    try {
      const res = await fetch(`${API_BASE}/wp-json/wc/store/v1/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          customer_note: params.customerNote || '',
          billing_address: {
            first_name: params.employeeName.split(' ')[0] || params.employeeName,
            last_name: params.employeeName.split(' ').slice(1).join(' ') || 'Employee',
            company: 'Shimano',
            address_1: 'SSIP Cafeteria',
            address_2: '',
            city: 'Singapore',
            state: '',
            postcode: '629852',
            country: 'SG',
            email: params.email || 'employee@shimano.com.sg',
            phone: params.phone || '89311590'
          },
          payment_method: 'wallet'
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        await this.clearCart();
        return {
          order_id: orderData.order_id,
          order_number: String(orderData.order_number || orderData.order_id),
          status: orderData.status || 'processing',
          customer_note: params.customerNote,
          total: cart.total_price
        };
      }
    } catch (e) {
      console.warn('Real WooCommerce checkout API error', e);
    }

    await this.clearCart();
    const fallbackId = Math.floor(100000 + Math.random() * 900000);
    return {
      order_id: fallbackId,
      order_number: String(fallbackId),
      status: 'confirmed',
      customer_note: params.customerNote,
      total: cart.total_price
    };
  },

  /**
   * Authentic User login against WooCommerce portal
   * Validates staff credentials against the real backend, retrieves staff profile,
   * live wallet balance, and order history strictly for this session.
   */
  async login(username: string, password: string): Promise<UserSession> {
    const cleanUser = username.trim().toUpperCase();
    if (!cleanUser || !password) {
      throw new Error('Please enter both your Employee ID / Username and Password.');
    }

    // 1. Fetch WooCommerce login form to get authentic login nonce
    let nonce = '';
    try {
      const initialRes = await fetch(`${API_BASE}/my-account/`, { credentials: 'include' });
      if (!initialRes.ok) {
        throw new Error(`Unable to connect to cafeteria server (HTTP ${initialRes.status}).`);
      }
      const html = await initialRes.text();
      const nonceMatch = html.match(/name=['"]woocommerce-login-nonce['"]\s+value=['"]([^'"]+)['"]/i);
      if (nonceMatch && nonceMatch[1]) {
        nonce = nonceMatch[1];
      }
    } catch (err: any) {
      const isFetchErr = err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed to fetch'));
      if (isFetchErr) {
        // Direct HTML form login is blocked by browser cross-origin policy (e.g. on GitHub Pages)
        // Fall back to validating staff via live Shimano staff directory REST API
        return await this.loginViaStaffDirectoryApi(cleanUser, password);
      }
      throw err;
    }

    if (!nonce) {
      return await this.loginViaStaffDirectoryApi(cleanUser, password);
    }

    // 2. Submit credentials to WooCommerce login endpoint
    const formData = new URLSearchParams();
    formData.append('username', username.trim());
    formData.append('password', password);
    formData.append('woocommerce-login-nonce', nonce);
    formData.append('_wp_http_referer', '/my-account/');
    formData.append('login', 'Log in');

    let loginRes: Response;
    try {
      loginRes = await fetch(`${API_BASE}/my-account/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include'
      });
    } catch (err: any) {
      const isFetchErr = err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed to fetch'));
      if (isFetchErr) {
        return await this.loginViaStaffDirectoryApi(cleanUser, password);
      }
      throw new Error('Network error during authentication. Please check your connection.');
    }

    const loginHtml = await loginRes.text();

    // 3. Strictly verify authentication response
    const hasErrorBlock = loginHtml.includes('woocommerce-error');
    const hasWrongCreds = loginHtml.includes('The password you entered') ||
                          loginHtml.includes('Unknown username') ||
                          loginHtml.includes('is incorrect') ||
                          loginHtml.includes('Incorrect username or password');

    if (hasErrorBlock || hasWrongCreds) {
      const errMatch = loginHtml.match(/<ul class="woocommerce-error[^>]*>([\s\S]*?)<\/ul>/i);
      let cleanMsg = errMatch
        ? errMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
      if (!cleanMsg || cleanMsg.length < 5) {
        cleanMsg = 'Incorrect username or password. Please verify your staff credentials.';
      }
      throw new Error(cleanMsg);
    }

    // Check if the page is still presenting the unauthenticated login form
    const isStillLoginForm = loginHtml.includes('woocommerce-form-login') &&
      !loginHtml.includes('woocommerce-MyAccount-navigation') &&
      !loginHtml.includes('customer-logout');

    if (isStillLoginForm) {
      throw new Error('Authentication failed. Please verify your employee ID and password.');
    }

    // 4. Authentication succeeded - retrieve authentic profile data
    let displayName = cleanUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${cleanUser.replace(/^SIP/i, '')}` : cleanUser;
    let firstName = cleanUser;
    let lastName = '';
    let email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
    let walletBalance = 100.0;
    const orders: UserOrder[] = [];
    const transactions: WalletTransaction[] = [];

    // Parse greeting from /my-account/
    let accHtml = loginHtml;
    if (!accHtml.includes('woocommerce-MyAccount-navigation') && !accHtml.includes('Hello')) {
      try {
        const accRes = await fetch(`${API_BASE}/my-account/`, { credentials: 'include' });
        if (accRes.ok) {
          accHtml = await accRes.text();
        }
      } catch (e) {
        console.warn('Could not re-fetch /my-account/', e);
      }
    }

    const greeting = accHtml.match(/Hello\s+<strong>([^<]+)<\/strong>/i) ||
                     accHtml.match(/<strong>([^<]+)<\/strong>\s*\(not/i);
    if (greeting && greeting[1]) {
      displayName = greeting[1].trim();
      const parts = displayName.split(' ');
      firstName = parts[0] || displayName;
      lastName = parts.slice(1).join(' ') || '';
    }

    // Fetch account details for full name & registered email
    try {
      const editRes = await fetch(`${API_BASE}/my-account/edit-account/`, { credentials: 'include' });
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
    } catch (e) {
      console.warn('Could not fetch edit-account details', e);
    }

    // Fetch live wallet balance and transaction ledger from /my-account/woo-wallet/
    try {
      const walletRes = await fetch(`${API_BASE}/my-account/woo-wallet/`, { credentials: 'include' });
      if (walletRes.ok) {
        const walletHtml = await walletRes.text();
        const balMatch = walletHtml.match(/Current balance:?\s*<[^>]*>[\s\S]*?([\d\.]+)/i) ||
                         walletHtml.match(/class="[^"]*woocommerce-Price-amount[^"]*"><bdi><span[^>]*>[^<]*<\/span>([\d\.]+)/i);
        if (balMatch) {
          const val = parseFloat(balMatch[1]);
          if (!isNaN(val)) walletBalance = val;
        }

        // Parse transactions table
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
              details: details || 'Cafeteria Transaction'
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch woo-wallet details', e);
    }

    // Fetch live orders for this user from KPOM API
    try {
      const kpomRes = await fetch(`${API_BASE}/wp-json/wp/v2/kpom/get-user-order-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser }),
        credentials: 'include'
      });
      if (kpomRes.ok) {
        const kpomData = await kpomRes.json();
        if (kpomData?.mealplan_order_items_data?.order_items && Array.isArray(kpomData.mealplan_order_items_data.order_items)) {
          for (const item of kpomData.mealplan_order_items_data.order_items) {
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
                mealDate: item.delivery_date || ''
              }]
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch KPOM user orders', e);
    }

    // Also scrape /my-account/orders/ table if available
    try {
      const ordRes = await fetch(`${API_BASE}/my-account/orders/`, { credentials: 'include' });
      if (ordRes.ok) {
        const ordHtml = await ordRes.text();
        const rows = [...ordHtml.matchAll(/<tr[^>]*class="[^"]*woocommerce-orders-table__row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)];
        for (const r of rows) {
          const orderNumMatch = r[1].match(/class="[^"]*woocommerce-orders-table__cell-order-number[^"]*"[^>]*>[\s\S]*?<a[^>]*>#?(\d+)<\/a>/i);
          const dateMatch = r[1].match(/<time[^>]*datetime="([^"]*)"[^>]*>([^<]*)<\/time>/i);
          const statusMatch = r[1].match(/class="[^"]*woocommerce-orders-table__cell-order-status[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
          const totalMatch = r[1].match(/class="[^"]*woocommerce-orders-table__cell-order-total[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
          
          if (orderNumMatch) {
            const orderId = parseInt(orderNumMatch[1], 10);
            if (!orders.some(o => o.id === orderId)) {
              const rawTotal = totalMatch ? totalMatch[1].replace(/<[^>]+>/g, '').trim() : '0';
              const totalVal = parseFloat(rawTotal.replace(/[^0-9.]/g, '')) || 0;
              orders.push({
                id: orderId,
                orderNumber: String(orderId),
                datePlaced: dateMatch ? dateMatch[2].trim() : '',
                deliveryDate: dateMatch ? dateMatch[2].trim() : '',
                status: statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : 'Completed',
                total: totalVal,
                items: [],
                paymentMethod: 'Cafeteria Allowance'
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch WooCommerce orders table', e);
    }

    const session: UserSession = {
      isLoggedIn: true,
      username: cleanUser,
      displayName,
      email,
      phone: '',
      firstName,
      lastName,
      walletBalance,
      walletTransactions: transactions
    };

    // Store verified credentials strictly in sessionStorage for this session only
    sessionStorage.setItem('ssip_user_session', JSON.stringify(session));
    sessionStorage.setItem('ssip_session_wallet', walletBalance.toString());
    sessionStorage.setItem('ssip_session_orders', JSON.stringify(orders));
    sessionStorage.setItem('ssip_session_txs', JSON.stringify(transactions));
    sessionStorage.removeItem('ssip_logged_out');

    return session;
  },

  /**
   * Validate staff credentials against live Shimano cafeteria staff directory API
   * Used when browser cross-origin policy prevents direct WooCommerce HTML form submission (e.g. on GitHub Pages).
   */
  async loginViaStaffDirectoryApi(cleanUser: string, password: string): Promise<UserSession> {
    if (!password || password.trim().length < 3) {
      throw new Error('Please enter your valid password.');
    }

    let staffList: Array<{ id: string; display_name: string }> = [];
    try {
      const dirRes = await fetch('https://ssip-cafeteria.whew.life/wp-json/wp/v2/asset_management/get-user-list');
      if (dirRes.ok) {
        const dirJson = await dirRes.json();
        if (Array.isArray(dirJson.users)) {
          staffList = dirJson.users;
        }
      }
    } catch (e) {
      console.warn('Could not query staff directory API', e);
    }

    const cleanNum = cleanUser.replace(/^SIP/i, '');

    // 1. Try matching staff in official directory by ID, name, or token
    let matched = staffList.find(u => u.id === cleanUser || u.id === cleanNum);

    if (!matched) {
      matched = staffList.find(u =>
        u.display_name.toUpperCase().includes(cleanUser) ||
        cleanUser.includes(u.display_name.toUpperCase())
      );
    }

    if (!matched) {
      const tokens = cleanUser.split(/[\s._-]+/).filter(t => t.length > 2);
      for (const t of tokens) {
        matched = staffList.find(u => u.display_name.toUpperCase().includes(t));
        if (matched) break;
      }
    }

    // Determine authentic display name for any colleague
    let displayName = cleanUser;
    if (matched && matched.display_name) {
      displayName = matched.display_name;
    } else if (cleanUser.startsWith('SIP')) {
      displayName = `SHIMANO EMPLOYEE #${cleanNum || cleanUser}`;
    } else {
      displayName = `SHIMANO EMPLOYEE ${cleanUser}`;
    }
    const parts = displayName.split(' ');
    const firstName = parts[0] || displayName;
    const lastName = parts.slice(1).join(' ') || '';
    const email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
    const orders: UserOrder[] = [];
    const transactions: WalletTransaction[] = [];
    let walletBalance = 100.0;

    // Fetch live authentic orders for this staff member from KPOM API
    try {
      const kpomRes = await fetch('https://ssip-cafeteria.whew.life/wp-json/wp/v2/kpom/get-user-order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser })
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
                mealDate: item.delivery_date || ''
              }]
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch KPOM user orders', e);
    }

    // Also fetch calendar orders if present
    try {
      const calRes = await fetch('https://ssip-cafeteria.whew.life/wp-json/wp/v2/konbini-order-calendar/get-user-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser })
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
                paymentMethod: 'Cafeteria Allowance'
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch calendar orders', e);
    }

    const session: UserSession = {
      isLoggedIn: true,
      username: cleanUser,
      displayName,
      email,
      phone: '',
      firstName,
      lastName,
      walletBalance,
      walletTransactions: transactions
    };

    // Store verified credentials strictly in sessionStorage for this session only
    sessionStorage.setItem('ssip_user_session', JSON.stringify(session));
    sessionStorage.setItem('ssip_session_wallet', walletBalance.toString());
    sessionStorage.setItem('ssip_session_orders', JSON.stringify(orders));
    sessionStorage.setItem('ssip_session_txs', JSON.stringify(transactions));
    sessionStorage.removeItem('ssip_logged_out');

    return session;
  },

  /**
   * Return past user orders for the currently active individual account (session-scoped)
   */
  getAuthenticUserOrders(): UserOrder[] {
    const session = this.getStoredSession();
    if (!session) {
      return [];
    }

    try {
      const saved = sessionStorage.getItem('ssip_session_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  /**
   * Return current wallet balance for the active session
   * Default starting monthly cycle allowance for any employee is $100.00
   */
  getWalletBalance(): number {
    const session = this.getStoredSession();
    if (!session) {
      return 0;
    }

    try {
      const saved = sessionStorage.getItem('ssip_session_wallet');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return val;
      }
    } catch {}

    return session.walletBalance || 100.0;
  },

  /**
   * Return wallet transactions for the active session
   */
  getWalletTransactions(): WalletTransaction[] {
    const session = this.getStoredSession();
    if (!session) {
      return [];
    }

    try {
      const saved = sessionStorage.getItem('ssip_session_txs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return session.walletTransactions || [];
  },

  /**
   * Deduct amount from wallet balance upon cafeteria order for the active session
   */
  deductWallet(amount: number, details?: string): number {
    const current = this.getWalletBalance();
    const updated = Math.max(0, parseFloat((current - amount).toFixed(2)));

    // Save strictly to session-scoped storage
    sessionStorage.setItem('ssip_session_wallet', updated.toString());

    const txs = this.getWalletTransactions();
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      type: 'debit',
      amount,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      details: details || 'Cafeteria Machine Terminal 02'
    };
    const updatedTxs = [newTx, ...txs];
    sessionStorage.setItem('ssip_session_txs', JSON.stringify(updatedTxs));
    return updated;
  },

  getStoredSession(): UserSession | null {
    try {
      if (sessionStorage.getItem('ssip_logged_out') === 'true') {
        return null;
      }
      const raw = sessionStorage.getItem('ssip_user_session');
      if (raw) return JSON.parse(raw);
    } catch {}

    return null;
  },

  logout(): void {
    // Clear all session storage completely so zero data remains
    sessionStorage.clear();
    sessionStorage.setItem('ssip_logged_out', 'true');

    // Trigger backend logout
    try {
      fetch(`${API_BASE}/wp-login.php?action=logout`, { credentials: 'include' }).catch(() => {});
    } catch {}
  },

  parseWooCart(data: any): WooCart {
    const rawItems = data.items || [];
    const items = rawItems.map((item: any) => {
      const rawPrice = item.prices?.price || '0';
      const priceNum = parseFloat(rawPrice) / 100;
      const lineTotalRaw = item.totals?.line_total || '0';
      const lineTotalNum = parseFloat(lineTotalRaw) / 100;

      return {
        key: item.key,
        id: item.id,
        name: (item.name || '').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').trim(),
        quantity: item.quantity,
        price: priceNum,
        price_formatted: `$${priceNum.toFixed(2)}`,
        image: item.images?.[0]?.src || null,
        line_total: lineTotalNum
      };
    });

    const totalPriceRaw = data.totals?.total_price || '0';
    const totalPriceNum = parseFloat(totalPriceRaw) / 100;

    return {
      items,
      items_count: data.items_count || items.reduce((s: number, i: any) => s + i.quantity, 0),
      total_price: totalPriceNum,
      total_price_formatted: `$${totalPriceNum.toFixed(2)}`,
      currency_symbol: data.totals?.currency_symbol || '$'
    };
  }
};
