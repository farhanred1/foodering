import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DateNavigationBar } from './components/DateNavigationBar';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { OrdersModal } from './components/OrdersModal';
import { CafeteriaAPI } from './services/api';
import { Shop, DailySchedule, CheckoutResult } from './types/cafeteria';
import { ArrowUp, Calendar, Wallet } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useOrders } from './context/OrdersContext';

export const App: React.FC = () => {
  const { user } = useAuth();
  const { walletBalance, setIsOrdersOpen } = useOrders();
  const [shops, setShops] = useState<Shop[]>([]);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<CheckoutResult | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadedShops = CafeteriaAPI.getShops();
    const rawSchedules = CafeteriaAPI.getDailySchedules();
    setShops(loadedShops);

    // Filter out past dates - only keep today and upcoming dates
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const futureOrTodaySchedules = rawSchedules.filter((s) => s.date >= todayStr);
    const activeSchedules = futureOrTodaySchedules.length > 0 ? futureOrTodaySchedules : rawSchedules;
    setSchedules(activeSchedules);

    if (activeSchedules.length > 0) {
      // Default to today if available, otherwise first upcoming date
      const todaySchedule = activeSchedules.find((s) => s.date === todayStr);
      setSelectedDate(todaySchedule ? todaySchedule.date : activeSchedules[0].date);
    }
  }, []);

  // Filter schedules by selected date and stall
  const visibleSchedules = useMemo(() => {
    let list = schedules;

    if (selectedDate !== 'All') {
      list = list.filter(s => s.date === selectedDate);
    }

    return list.map(sched => {
      let items = sched.items;

      if (selectedShopId !== null) {
        items = items.filter(i => i.shopId === selectedShopId);
      }

      return {
        ...sched,
        filteredItems: items
      };
    });
  }, [schedules, selectedDate, selectedShopId]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is logged out, show the dedicated full-screen login page
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Header */}
      <Header />

      {/* Date Navigation & Stall Filter Bar */}
      <DateNavigationBar
        schedules={schedules}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        shops={shops}
        selectedShopId={selectedShopId}
        onSelectShop={setSelectedShopId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-6">
        
        {/* Global Toolbar: Clean row with Wallet Button and Active Date */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 bg-white p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            {/* Wallet Button */}
            {user && (
              <button
                onClick={() => setIsOrdersOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                title="View Cafeteria Wallet balance & meal orders"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Wallet:</span>
                <span className="font-extrabold">${walletBalance.toFixed(2)}</span>
              </button>
            )}

            <span className="text-xs font-bold text-slate-700 hidden sm:inline">
              Selected: <span className="text-brand-600 font-extrabold">{selectedDate === 'All' ? 'All Upcoming Dates' : schedules.find(s => s.date === selectedDate)?.label || selectedDate}</span>
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full text-[11px]">
              {selectedDate === 'All' ? 'All Set Menus' : '5 Options Available'}
            </span>
          </div>
        </div>

        {/* Date Sections: Date 1 -> 5 Options, Date 2 -> 5 Options... */}
        <div className="space-y-8 sm:space-y-12">
          {visibleSchedules.map((sched) => (
            <section
              key={sched.date}
              id={`date-section-${sched.date}`}
              className="scroll-mt-28 sm:scroll-mt-36"
            >
              {/* Date Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 pb-2 sm:pb-3 border-b-2 border-slate-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-xs shadow-brand-500/20 shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                      {sched.label}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {sched.filteredItems.length} of {sched.items.length} options available
                    </p>
                  </div>
                </div>

                {selectedDate === 'All' && (
                  <button
                    onClick={() => {
                      setSelectedDate(sched.date);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[11px] sm:text-xs font-bold text-slate-600 hover:text-brand-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors"
                  >
                    View Only This Day
                  </button>
                )}
              </div>

              {/* 5 Meal Options Container: Compact rows on mobile, Cards grid on tablet/desktop */}
              {sched.filteredItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  <p className="text-sm font-semibold">No options match your current filter for this date.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4">
                  {sched.filteredItems.map((product) => (
                    <ProductCard
                      key={`${sched.date}-${product.id}`}
                      product={product}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">SSIP Cafeteria App</span> — 5 daily lunch options across cafeteria stalls.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Direct WooCommerce API Ordering</span>
            <span>•</span>
            <span>GitHub Pages</span>
          </div>
        </div>
      </footer>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 p-3 bg-slate-900 hover:bg-brand-600 text-white rounded-full shadow-lg shadow-slate-900/20 transition-all hover:scale-110 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Modals & Slide-out Drawers */}
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderPlaced={(order) => {
          setIsCheckoutOpen(false);
          setConfirmedOrder(order);
        }}
      />

      <OrderSuccessModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
      />

      <OrdersModal />

      <LoginModal />
    </div>
  );
};
