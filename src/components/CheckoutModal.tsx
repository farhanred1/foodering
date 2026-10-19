import React, { useState } from 'react';
import { X, User, AlertCircle, ExternalLink, Send } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { CafeteriaAPI } from '../services/api';
import { CheckoutResult } from '../types/cafeteria';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (result: CheckoutResult) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderPlaced }) => {
  const { cart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();

  const [employeeName, setEmployeeName] = useState(
    user?.displayName || user?.firstName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user?.username || ''
  );
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeName.trim()) {
      setErrorMsg('Please enter your Employee ID or Name.');
      return;
    }

    setLoading(true);
    try {
      const result = await CafeteriaAPI.submitCheckout({
        employeeName,
        customerNote,
        email: user?.email,
        phone: user?.phone
      });

      // Determine meal date for order
      const dates = cart.items.map(i => i.mealDate).filter(Boolean) as string[];
      const todayIso = (() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();
      const mealDate = dates.length > 0 ? dates[0] : todayIso;

      // Save order to native order history
      addOrder({
        id: result.order_id,
        orderNumber: result.order_number,
        datePlaced: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        mealDate,
        status: 'Confirmed',
        total: result.total,
        items: cart.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          mealDate: item.mealDate || mealDate
        })),
        customerNote: customerNote,
        paymentMethod: 'KONBINI_WALLET'
      });

      onOrderPlaced(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Confirm Cafeteria Order</h3>
            <p className="text-xs text-slate-500">Order via WooCommerce Cafeteria System</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Employee Name / ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Farhan or Employee ID"
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          {/* Order Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kitchen / Stall Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g. Less spicy, separate sauce, pickup at 12:15 PM"
              className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Cart Breakdown */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Items in Order:</span>
              <span>{cart.items_count} items</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Price:</span>
              <span className="font-extrabold text-slate-900 text-sm">{cart.total_price_formatted}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-brand-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Cafeteria Order'}</span>
            </button>

            <a
              href="https://ssip-cafeteria.whew.life/checkout/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Open the official WooCommerce checkout page directly"
            >
              <span>Open on Web</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

        </form>

      </div>
    </div>
  );
};
