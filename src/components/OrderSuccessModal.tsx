import React from 'react';
import { CheckCircle2, X, Receipt, Wallet } from 'lucide-react';
import { CheckoutResult } from '../types/cafeteria';
import { useOrders } from '../context/OrdersContext';

interface OrderSuccessModalProps {
  order: CheckoutResult | null;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onClose }) => {
  const { setIsOrdersOpen } = useOrders();

  if (!order) return null;

  const handleViewOrders = () => {
    onClose();
    setIsOrdersOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-brand-600 p-5 sm:p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 sm:top-4 right-3.5 sm:right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Order Placed!</h2>
          <p className="text-xs text-emerald-100 mt-0.5">Submitted to Shimano Cafeteria System</p>
        </div>

        {/* Details Card */}
        <div className="p-4 sm:p-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Number</span>
            <div className="text-3xl font-black text-brand-700 my-1 tracking-tight">
              #{order.order_number}
            </div>
            <div className="text-xs text-slate-500 capitalize">
              Status: <span className="font-semibold text-slate-800">{order.status}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                Total Amount
              </span>
              <span className="font-bold text-slate-900">${order.total.toFixed(2)}</span>
            </div>

            {order.customer_note && (
              <div className="pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                <span className="text-slate-500 italic">{order.customer_note}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={handleViewOrders}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>View in Wallet & Orders</span>
            </button>

            <button
              onClick={onClose}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Back to Menu
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
