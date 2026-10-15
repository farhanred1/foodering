import React from 'react';
import { ShoppingBag, User, LogOut, UtensilsCrossed, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';

interface HeaderProps {
  // Empty props
}

export const Header: React.FC<HeaderProps> = () => {
  const { cart, setIsCartOpen } = useCart();
  const { user, logout, setIsLoginModalOpen } = useAuth();
  const { walletBalance, setIsOrdersOpen } = useOrders();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-2 sm:gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg md:text-xl">SSIP Cafeteria</span>
                <span className="bg-brand-100 text-brand-800 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider hidden xs:inline-block">Shimano</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden md:block">Direct Canteen Ordering Portal</p>
            </div>
          </div>

          {/* Right Action Controls: Wallet, User, Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Native Cafeteria Wallet (Only visible when logged in) */}
            {user && (
              <button
                onClick={() => setIsOrdersOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95"
                title="View Cafeteria Wallet balance & meal orders"
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Wallet:</span>
                <span className="font-extrabold text-[11px] sm:text-xs">${walletBalance.toFixed(2)}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-1.5">
                {/* User Dropdown / Logout */}
                <div className="flex items-center gap-1 bg-slate-100 pl-2 sm:pl-3 pr-1 sm:pr-1.5 py-1 sm:py-1.5 rounded-full text-xs text-slate-700">
                  <span className="font-semibold truncate max-w-[70px] sm:max-w-[110px] text-[11px] sm:text-xs">
                    {user.firstName || user.displayName || user.username}
                  </span>
                  <button
                    onClick={logout}
                    title="Log Out"
                    className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-700 bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full transition-all"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Log In</span>
              </button>
            )}

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1 sm:gap-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full shadow-md shadow-brand-600/25 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-semibold text-xs hidden sm:inline">Tray</span>
              {cart.items_count > 0 && (
                <span className="bg-white text-brand-700 font-extrabold text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full shadow-inner">
                  {cart.items_count}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
