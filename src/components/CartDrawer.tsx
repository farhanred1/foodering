import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const { cart, updateQuantity, removeFromCart, clearCart, isCartOpen, setIsCartOpen, loading } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">Your Tray</h2>
              <span className="bg-brand-100 text-brand-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.items_count}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 text-base">Your tray is empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Explore the canteen stalls and add meals to your order.
                </p>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.key || item.id} className="py-4 first:pt-0 last:pb-0 flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-medium uppercase">
                        Food
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-slate-800 text-sm truncate">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.key, item.id)}
                        disabled={loading}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      ${item.price.toFixed(2)} each
                    </div>

                    {/* Quantity Adjustment & Item Total */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-full border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.key, item.id, item.quantity - 1)}
                          disabled={loading}
                          className="w-6 h-6 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.key, item.id, item.quantity + 1)}
                          disabled={loading}
                          className="w-6 h-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-xs disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900">
                        ${item.line_total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {cart.items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3 sm:space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${cart.total_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax / GST</span>
                  <span className="text-emerald-600 font-semibold">Included</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-brand-700">${cart.total_price.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onOpenCheckout();
                  }}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-brand-600/25 transition-all disabled:opacity-50"
                >
                  <span>Proceed to Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
