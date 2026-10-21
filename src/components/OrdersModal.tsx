import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  ShoppingBag,
  RefreshCw,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  Receipt
} from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { UserOrder } from '../types/cafeteria';

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeToIso(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

function categorizeOrder(order: UserOrder, todayIso: string): 'today' | 'upcoming' | 'past' {
  const mealIso = normalizeToIso(order.mealDate);
  const placedIso = normalizeToIso(order.datePlaced);
  const targetIso = mealIso || placedIso;

  if (targetIso) {
    if (targetIso === todayIso) return 'today';
    if (targetIso > todayIso) return 'upcoming';
    return 'past';
  }

  return 'past';
}

function formatDateLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const isoMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return dateStr;
}

export const OrdersModal: React.FC = () => {
  const { orders, isOrdersOpen, setIsOrdersOpen, walletBalance, walletTransactions, refreshOrders } = useOrders();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet' | 'profile'>('orders');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayIso = useMemo(() => getTodayIso(), []);
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  useEffect(() => {
    if (isOrdersOpen) {
      refreshOrders();
    }
  }, [isOrdersOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const { todayOrders, upcomingOrders, pastOrders } = useMemo(() => {
    const today: UserOrder[] = [];
    const upcoming: UserOrder[] = [];
    const past: UserOrder[] = [];

    orders.forEach((o) => {
      const cat = categorizeOrder(o, todayIso);
      if (cat === 'today') today.push(o);
      else if (cat === 'upcoming') upcoming.push(o);
      else past.push(o);
    });

    upcoming.sort((a, b) => {
      const dateA = normalizeToIso(a.mealDate) || normalizeToIso(a.datePlaced) || '';
      const dateB = normalizeToIso(b.mealDate) || normalizeToIso(b.datePlaced) || '';
      return dateA.localeCompare(dateB);
    });

    past.sort((a, b) => {
      const dateA = normalizeToIso(a.mealDate) || normalizeToIso(a.datePlaced) || '';
      const dateB = normalizeToIso(b.mealDate) || normalizeToIso(b.datePlaced) || '';
      return dateB.localeCompare(dateA);
    });

    return { todayOrders: today, upcomingOrders: upcoming, pastOrders: past };
  }, [orders, todayIso]);

  if (!isOrdersOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={() => setIsOrdersOpen(false)}
      />

      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header with User Info */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-brand-700/20 text-sm">
              {(user.firstName ? user.firstName[0] : (user.displayName ? user.displayName[0] : 'U')).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                  {user.displayName || user.firstName || user.username}
                </h3>
                <span className="bg-brand-100 text-brand-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {user.userId ? `#${user.userId}` : user.username}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {user.company || 'Shimano (Singapore) Pte Ltd'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleManualRefresh}
              className="p-2 text-slate-400 hover:text-brand-700 hover:bg-brand-50 rounded-full transition-all cursor-pointer"
              title="Refresh wallet balance & order status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
            <button
              onClick={() => setIsOrdersOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-white px-3 sm:px-5 shrink-0 gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>My Orders</span>
            {orders.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'orders' ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Cafeteria Wallet</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-emerald-100 text-emerald-800">
              ${walletBalance.toFixed(2)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Staff Profile</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: ORDERS & MEALS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">

              {/* Quick Account Status Banner */}
              <div className="bg-gradient-to-r from-brand-50 via-emerald-50 to-indigo-50 border border-brand-100/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {(user.firstName ? user.firstName[0] : (user.displayName ? user.displayName[0] : 'U')).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-xs">{user.displayName || user.username}</span>
                      <span className="text-[10px] text-brand-800 bg-brand-100 font-extrabold px-1.5 py-0.2 rounded-full">
                        {user.userId ? `#${user.userId}` : user.username}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Verified Shimano Staff Account</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('wallet')}
                  className="flex items-center gap-1 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="View Cafeteria Wallet"
                >
                  <Wallet className="w-3 h-3 text-emerald-600" />
                  <span>${walletBalance.toFixed(2)}</span>
                </button>
              </div>
              
              {/* Today's Food Order */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Today's Meal Order</span>
                    <span className="text-xs font-normal text-slate-400">({todayLabel})</span>
                  </h4>
                  {todayOrders.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {todayOrders.length} {todayOrders.length === 1 ? 'Meal' : 'Meals'}
                    </span>
                  )}
                </div>

                {todayOrders.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center text-slate-500 text-xs">
                    No orders scheduled for today yet.
                  </div>
                ) : (
                  todayOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border-2 border-emerald-500/40 p-4 shadow-xs space-y-2.5 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">
                            Order #{order.orderNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{order.status || 'Confirmed'}</span>
                          </span>
                        </div>
                        <span className="text-sm font-black text-brand-700">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 divide-y divide-slate-100 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 first:pt-0 last:pb-0">
                            <span className="text-slate-800 font-semibold">
                              <span className="font-extrabold text-brand-700 mr-2">{item.quantity}×</span>
                              {item.name}
                            </span>
                            {item.price > 0 && (
                              <span className="font-bold text-slate-700">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatDateLabel(order.mealDate || order.datePlaced)}</span>
                        </span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                          Paid via Cafeteria Allowance
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upcoming Days Pre-Orders */}
              {upcomingOrders.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span>Upcoming Pre-Orders ({upcomingOrders.length})</span>
                  </h4>
                  {upcomingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-brand-200 p-3.5 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100 uppercase tracking-wider">
                          📅 {formatDateLabel(order.mealDate || order.datePlaced)}
                        </span>
                        <span className="text-xs font-black text-brand-700">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Order #{order.orderNumber} • <span className="text-amber-600 font-semibold">{order.status || 'Confirmed'}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700">
                        {order.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between py-0.5">
                            <span>{i.quantity}× {i.name}</span>
                            <span>${(i.price * i.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Past Canteen Orders */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Past Canteen Orders</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold">
                    {pastOrders.length} Completed
                  </span>
                </div>

                {pastOrders.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-slate-400 text-xs">
                    <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    <span>No previous order records found.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pastOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-3.5 text-xs space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs">
                              Order #{order.orderNumber}
                            </span>
                            <span className="text-slate-400 ml-2 text-[11px]">
                              {formatDateLabel(order.mealDate || order.datePlaced)}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 divide-y divide-slate-100">
                            {order.items.map((it, iIdx) => (
                              <div key={iIdx} className="flex justify-between py-0.5 first:pt-0 last:pb-0">
                                <span>{it.quantity}× {it.name}</span>
                                {it.price > 0 && <span>${(it.price * it.quantity).toFixed(2)}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{order.status || 'Completed'}</span>
                          </span>
                          <span>Payment: {order.paymentMethod || 'Cafeteria Allowance'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: KONBINI WALLET & TRANSACTIONS */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              
              {/* Prominent Wallet Balance Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-700/20">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between text-xs text-emerald-100 mb-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-300" />
                    <span>Shimano Konbini Cafeteria Wallet</span>
                  </div>
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    Active Verified
                  </span>
                </div>

                <div className="my-2">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold block mb-1">
                    Live Current Balance
                  </span>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight">
                    ${walletBalance.toFixed(2)}
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
                  <div>
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Staff ID</span>
                    <span className="font-bold text-white tracking-wide">{user.userId ? `#${user.userId}` : user.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white/60 block text-[10px] uppercase font-bold">Monthly Cycle Allowance</span>
                    <span className="font-bold text-white tracking-wide">$100.00 / Cycle</span>
                  </div>
                </div>
              </div>

              {/* Transactions History Table */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Wallet Activity & Deductions ({walletTransactions.length})</span>
                </h4>

                {walletTransactions.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-slate-400 text-xs">
                    No individual wallet deduction records logged yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {walletTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">{tx.details}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </div>
                        <span className={`font-black text-xs ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: STAFF PROFILE & ACCOUNT DETAILS */}
          {activeTab === 'profile' && (
            <div className="space-y-3.5">
              
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black text-indigo-300">
                  {(user.firstName ? user.firstName[0] : (user.displayName ? user.displayName[0] : 'U')).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-white text-base">
                    {user.displayName || user.username}
                  </h4>
                  <p className="text-xs text-indigo-200">
                    {user.company || 'Shimano (Singapore) Pte Ltd'}
                  </p>
                </div>
              </div>

              {/* Account Data Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 text-xs">
                
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Full Legal Name</span>
                  </span>
                  <span className="font-bold text-slate-900">{user.displayName || user.username}</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Employee / Staff ID</span>
                  </span>
                  <span className="font-bold text-slate-900">{user.userId ? `#${user.userId}` : user.username}</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>Company</span>
                  </span>
                  <span className="font-bold text-slate-900">{user.company || 'Shimano (Singapore) Pte Ltd'}</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Email Address</span>
                  </span>
                  <span className="font-bold text-brand-700">{user.email || 'None on file'}</span>
                </div>

                {user.phone && (
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>Contact Phone</span>
                    </span>
                    <span className="font-bold text-slate-900">{user.phone}</span>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Current Wallet Balance</span>
                  </span>
                  <span className="font-black text-emerald-700 text-sm">${walletBalance.toFixed(2)}</span>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-medium">
            Live Synchronized with SSIP Cafeteria
          </div>
          <button
            onClick={() => setIsOrdersOpen(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
