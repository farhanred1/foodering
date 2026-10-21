export interface Shop {
  id: 'chinese' | 'malay' | 'international' | 'drinks';
  name: string;
  cuisine: string;
  color: string;
  icon: string;
}

export interface Product {
  id: number;
  name: string;
  displayName: string;
  price: number;
  price_formatted: string;
  description: string;
  is_in_stock: boolean;
  image: string | null;
  shopId: 'chinese' | 'malay' | 'international' | 'drinks';
  shopName: string;
  shopCuisine: string;
  date: string;
}

export interface DailySchedule {
  date: string;
  label: string;
  items: Product[];
}

export interface WooCartItem {
  key: string;
  id: number;
  name: string;
  quantity: number;
  price: number;
  price_formatted: string;
  image: string | null;
  shopId?: string;
  shopName?: string;
  line_total: number;
  mealDate?: string;
}

export interface WooCart {
  items: WooCartItem[];
  items_count: number;
  total_price: number;
  total_price_formatted: string;
  currency_symbol: string;
}

export interface WalletTransaction {
  id: string;
  type: 'debit' | 'credit' | string;
  amount: number;
  date: string;
  details: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  walletBalance?: number | null;  // null = unavailable (balance API needs machine token)
  walletTransactions?: WalletTransaction[];
  orders?: UserOrder[];
}

export interface CheckoutResult {
  order_id: number;
  order_number: string;
  status: string;
  customer_note?: string;
  total: number;
}

export interface OrderItemRecord {
  id: number;
  name: string;
  price: number;
  quantity: number;
  mealDate?: string;
}

export interface UserOrder {
  id: string | number;
  orderNumber: string;
  datePlaced: string;
  deliveryDate?: string;
  status: 'Confirmed' | 'Preparing' | 'Ready for Pickup' | 'Completed' | string;
  total: number;
  items: OrderItemRecord[];
  customerNote?: string;
  mealDate?: string;
  paymentMethod?: string;
}
