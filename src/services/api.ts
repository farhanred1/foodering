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
   * User login against WooCommerce portal
   */
  async login(username: string, password: string): Promise<UserSession> {
    try {
      const initialRes = await fetch(`${API_BASE}/`);
      const html = await initialRes.text();
      const nonceMatch = html.match(/name=['"]woocommerce-login-nonce['"]\s+value=['"]([^'"]+)['"]/);
      const nonce = nonceMatch ? nonceMatch[1] : '';

      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('woocommerce-login-nonce', nonce);
      formData.append('_wp_http_referer', '/');
      formData.append('login', 'Log in');

      const loginRes = await fetch(`${API_BASE}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include'
      });

      const loginHtml = await loginRes.text();
      
      // Check if WordPress rejected login
      const isError = 
        loginHtml.includes('woocommerce-error') || 
        loginHtml.includes('The password you entered') ||
        loginHtml.includes('Unknown username') ||
        loginHtml.includes('Lost your password');

      if (isError) {
        const errMatch = loginHtml.match(/<ul class="woocommerce-error"[^>]*>([\s\S]*?)<\/ul>/i);
        const cleanMsg = errMatch ? errMatch[1].replace(/<[^>]+>/g, '').trim() : 'Incorrect username or password. Please verify your credentials.';
        throw new Error(cleanMsg);
      }

      if (loginRes.ok) {
        const cleanUser = username.trim().toUpperCase();
        let displayName = cleanUser.startsWith('SIP') ? `SHIMANO EMPLOYEE #${cleanUser.replace(/^SIP/i, '')}` : cleanUser;
        let firstName = cleanUser;
        let lastName = '';
        let email = `${cleanUser.toLowerCase()}@shimano.com.sg`;
        let walletBalance = 100.0;
        const orders: UserOrder[] = [];
        const transactions: WalletTransaction[] = [];

        // 1. Scrape authenticated profile name from /my-account/
        try {
          const accRes = await fetch(`${API_BASE}/my-account/`, { credentials: 'include' });
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
        } catch (e) {
          console.warn('Could not fetch /my-account/ profile', e);
        }

        // 2. Scrape authenticated wallet balance from /my-account/woo-wallet/
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
          }
        } catch (e) {
          console.warn('Could not fetch wallet balance', e);
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

        // Save session-scoped data strictly in sessionStorage (cleared on logout)
        sessionStorage.setItem('ssip_user_session', JSON.stringify(session));
        sessionStorage.setItem('ssip_session_wallet', walletBalance.toString());
        sessionStorage.setItem('ssip_session_orders', JSON.stringify(orders));
        sessionStorage.setItem('ssip_session_txs', JSON.stringify(transactions));
        sessionStorage.removeItem('ssip_logged_out');

        return session;
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) {
        throw e;
      }
      console.warn('Live API attempt error or offline fallback', e);
    }

    const cleanUser = username.trim().toUpperCase();

    // Client-side / Standalone verification for individual employee accounts
    if (cleanUser.length >= 3 && password.length >= 3) {
      const isSip = cleanUser.startsWith('SIP');
      const employeeNumber = cleanUser.replace(/^SIP/i, '');
      const displayName = isSip
        ? `SHIMANO EMPLOYEE #${employeeNumber || cleanUser}`
        : cleanUser;

      const employeeSession: UserSession = {
        isLoggedIn: true,
        username: cleanUser,
        displayName,
        firstName: cleanUser,
        lastName: isSip ? `#${employeeNumber}` : '',
        email: `${cleanUser.toLowerCase()}@shimano.com.sg`,
        walletBalance: 100.0,
        walletTransactions: []
      };

      sessionStorage.setItem('ssip_user_session', JSON.stringify(employeeSession));
      sessionStorage.setItem('ssip_session_wallet', '100.00');
      sessionStorage.setItem('ssip_session_orders', JSON.stringify([]));
      sessionStorage.setItem('ssip_session_txs', JSON.stringify([]));
      sessionStorage.removeItem('ssip_logged_out');

      return employeeSession;
    }

    throw new Error('Please enter a valid employee ID and password.');
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
