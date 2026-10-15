import React, { useState, useMemo } from 'react';
import { X, Wallet, Clock, CheckCircle2, ChevronDown, ChevronUp, Calendar, ArrowDownRight, User, AlertCircle, ShoppingBag } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { UserOrder } from '../types/cafeteria';

function categorizeOrder(order: UserOrder): 'today' | 'upcoming' | 'past' {
  const targetStr = order.mealDate || order.datePlaced || '';
  const str = targetStr.toLowerCase();

  // Today is October 15, 2026
  if (str.includes('oct 15') || str.includes('october 15') || str.includes('2026-10-15')) {
    return 'today';
  }

  const parsed = new Date(targetStr);
  if (!isNaN(parsed.getTime())) {
    const today = new Date('2026-10-15T00:00:00');
    parsed.setHours(0, 0, 0, 0);
    if (parsed.getTime() === today.getTime()) return 'today';
    if (parsed.getTime() > today.getTime()) return 'upcoming';
    return 'past';
  }

  const matchDay = str.match(/oct(?:ober)?\s*(\d{1,2})/);
  if (matchDay) {
    const day = parseInt(matchDay[1], 10);
    if (day === 15) return 'today';
    if (day > 15) return 'upcoming';
    return 'past';
  }

  return 'past';
}

function formatDateLabel(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('2026-10-16') || dateStr.toLowerCase().includes('oct 16')) return 'Friday, Oct 16, 2026';
  if (dateStr.includes('2026-10-19') || dateStr.toLowerCase().includes('oct 19')) return 'Monday, Oct 19, 2026';
  if (dateStr.includes('2026-10-20') || dateStr.toLowerCase().includes('oct 20')) return 'Tuesday, Oct 20, 2026';
  if (dateStr.includes('2026-10-21') || dateStr.toLowerCase().includes('oct 21')) return 'Wednesday, Oct 21, 2026';
  if (dateStr.includes('2026-10-22') || dateStr.toLowerCase().includes('oct 22')) return 'Thursday, Oct 22, 2026';
  if (dateStr.includes('2026-10-23') || dateStr.toLowerCase().includes('oct 23')) return 'Friday, Oct 23, 2026';
  if (dateStr.includes('2026-10-26') || dateStr.toLowerCase().includes('oct 26')) return 'Monday, Oct 26, 2026';
  if (dateStr.includes('2026-10-27') || dateStr.toLowerCase().includes('oct 27')) return 'Tuesday, Oct 27, 2026';
  if (dateStr.includes('2026-10-28') || dateStr.toLowerCase().includes('oct 28')) return 'Wednesday, Oct 28, 2026';
  return dateStr;
}

export const OrdersModal: React.FC = () => {
  const { orders, isOrdersOpen, setIsOrdersOpen, walletBalance, walletTransactions } = useOrders();
  const { user } = useAuth();
  const [showPastHistory, setShowPastHistory] = useState(false);

  const { todayOrders, upcomingOrders, pastOrders } = useMemo(() => {
    const today: UserOrder[] = [];
    const upcoming: UserOrder[] = [];
    const past: UserOrder[] = [];

    orders.forEach((o) => {
      const cat = categorizeOrder(o);
      if (cat === 'today') today.push(o);
      else if (cat === 'upcoming') upcoming.push(o);
      else past.push(o);
    });

    return { todayOrders: today, upcomingOrders: upcoming, pastOrders: past };
  }, [orders]);

  if (!isOrdersOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={() => setIsOrdersOpen(false)}
      />

      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Cafeteria Wallet & Orders
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {user?.username || 'SIP279'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {user?.displayName || 'FARHAN REDUAN AHAMMED #2313'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOrdersOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* 1. Big Prominent Wallet Balance Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-700/20">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between text-xs text-emerald-100 mb-2 font-semibold">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Shimano Konbini Cafeteria Wallet</span>
              </div>
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                Active
              </span>
            </div>

            <div className="my-2">
              <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold block mb-1">
                Current Wallet Balance
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight">
                ${walletBalance.toFixed(2)}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
              <div>
                <span className="text-white/60 block text-[10px] uppercase font-bold">Account ID</span>
                <span className="font-bold text-white tracking-wide">{user?.username || 'SIP279'}</span>
              </div>
              <div className="text-right">
                <span className="text-white/60 block text-[10px] uppercase font-bold">Employee</span>
                <span className="font-bold text-white truncate max-w-[190px] block">
                  {user?.displayName || 'FARHAN REDUAN AHAMMED'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. TODAY'S FOOD ORDERS (October 15, 2026) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Today's Lunch Order</span>
                <span className="text-xs font-normal text-slate-400">(Thu, Oct 15, 2026)</span>
              </h4>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {todayOrders.length} {todayOrders.length === 1 ? 'Meal' : 'Meals'}
              </span>
            </div>

            {todayOrders.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs">
                No orders placed for today yet.
              </div>
            ) : (
              todayOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border-2 border-emerald-500/30 p-4 shadow-sm space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                    Today
                  </div>

                  <div className="flex items-center justify-between pr-16">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        Order #{order.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{order.status}</span>
                      </span>
                    </div>

                    <span className="text-sm font-black text-brand-700">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>

                  {/* Food Items */}
                  <div className="bg-slate-50 rounded-xl p-3 divide-y divide-slate-100 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
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

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{order.datePlaced}</span>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Paid via Konbini Wallet
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. UPCOMING DAYS ORDERS (October 16 onwards) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>Upcoming Days Pre-Orders</span>
              </h4>
              {upcomingOrders.length > 0 && (
                <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                  {upcomingOrders.length} {upcomingOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              )}
            </div>

            {upcomingOrders.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center text-slate-400">
                <ShoppingBag className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                <p className="font-bold text-slate-700 text-xs">No upcoming pre-orders yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your meals from tomorrow or next week on the menu to pre-order your lunch in advance.
                </p>
              </div>
            ) : (
              upcomingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-brand-200 p-4 shadow-xs space-y-3 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100 uppercase tracking-wider">
                        📅 {formatDateLabel(order.mealDate || order.datePlaced)}
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-brand-700">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-xs">
                      Order #{order.orderNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span>{order.status || 'Confirmed'}</span>
                    </span>
                  </div>

                  {/* Food Items */}
                  <div className="bg-slate-50 rounded-xl p-3 divide-y divide-slate-100 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                        <span className="text-slate-800 font-semibold">
                          <span className="font-bold text-brand-700 mr-2">{item.quantity}×</span>
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

                  {order.customerNote && (
                    <p className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      Kitchen note: "{order.customerNote}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 4. PAST ORDERS & WALLET DEDUCTIONS (COLLAPSIBLE) */}
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => setShowPastHistory(!showPastHistory)}
              className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Past Canteen Orders & Wallet Deductions ({pastOrders.length} previous meals)</span>
              </div>
              {showPastHistory ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showPastHistory && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Past Orders List */}
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Previous Days Meal History
                  </h5>
                  {pastOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl border border-slate-200/80 p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          Order #{order.orderNumber} • <span className="text-slate-500 font-normal">{order.datePlaced}</span>
                        </span>
                        <span className="font-extrabold text-slate-900">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {order.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Machine Deduction Logs */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Canteen Machine Deductions (Terminal 02)
                  </h5>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {walletTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-700 text-[11px]">{tx.details}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </div>
                        <span className="font-bold text-red-600 text-xs">
                          -${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={() => setIsOrdersOpen(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
