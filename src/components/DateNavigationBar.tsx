import React from 'react';
import { DailySchedule, Shop } from '../types/cafeteria';
import { Calendar, UtensilsCrossed, Soup, Utensils, Coffee, Sparkles } from 'lucide-react';

interface DateNavigationBarProps {
  schedules: DailySchedule[];
  selectedDate: string; // 'All' or '2026-10-16'
  onSelectDate: (date: string) => void;
  shops: Shop[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string | null) => void;
}

export const DateNavigationBar: React.FC<DateNavigationBarProps> = ({
  schedules,
  selectedDate,
  onSelectDate,
  shops,
  selectedShopId,
  onSelectShop,
}) => {
  const getShopIcon = (id: string, className: string = 'w-3.5 h-3.5') => {
    switch (id) {
      case 'malay':
        return <UtensilsCrossed className={className} />;
      case 'chinese':
        return <Soup className={className} />;
      case 'international':
        return <Utensils className={className} />;
      case 'drinks':
        return <Coffee className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const getShopStyles = (id: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200';
    }
    switch (id) {
      case 'malay':
        return 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20';
      case 'chinese':
        return 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20';
      case 'international':
        return 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20';
      case 'drinks':
        return 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/20';
      default:
        return 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-900/20';
    }
  };

  return (
    <div className="sticky top-14 sm:top-16 md:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 space-y-2">
        
        {/* Row 1: Calendar Date Dropdown & Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-slate-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600" />
              <span className="hidden xs:inline">Date:</span>
            </div>

            {/* Dropdown Selector (Matching Real Website) */}
            <select
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200/80 font-bold text-slate-800 text-xs sm:text-sm rounded-xl px-2.5 sm:px-3 py-1.5 outline-none cursor-pointer border border-slate-300 shadow-xs focus:ring-2 focus:ring-brand-500/20 truncate"
            >
              <option value="All">All Dates (5 options per day)</option>
              {schedules.map((s) => (
                <option key={s.date} value={s.date}>
                  {s.label} ({s.items.length} Options)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Pills (Horizontal scrollable on mobile) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 py-0.5">
            <button
              onClick={() => onSelectDate('All')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedDate === 'All'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All
            </button>
            {schedules.map((s) => {
              const isActive = selectedDate === s.date;
              const short = s.label.split(',')[0].slice(0, 3) + ' ' + (s.label.split(',')[1] || '').trim();
              return (
                <button
                  key={s.date}
                  onClick={() => onSelectDate(s.date)}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Filter by 4 Stalls (Horizontal scroll on mobile) */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 py-0.5">
          <div className="flex items-center gap-1 shrink-0 text-slate-500 mr-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider hidden sm:flex">
            <span>Stall:</span>
          </div>

          <button
            onClick={() => onSelectShop(null)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
              selectedShopId === null
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>All 4 Stalls</span>
          </button>

          {shops.map((shop) => {
            const isSelected = selectedShopId === shop.id;
            return (
              <button
                key={shop.id}
                onClick={() => onSelectShop(shop.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${getShopStyles(
                  shop.id,
                  isSelected
                )}`}
              >
                {getShopIcon(shop.id, 'w-3 h-3 sm:w-3.5 sm:h-3.5')}
                <span>{shop.name}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
