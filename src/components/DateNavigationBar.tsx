import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DailySchedule, Shop } from '../types/cafeteria';
import { Calendar, ChevronDown, Check, UtensilsCrossed, Soup, Utensils, Coffee, Sparkles } from 'lucide-react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedSchedule = schedules.find((s) => s.date === selectedDate);
  const isSelectedToday = selectedDate === todayStr;
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
        
        {/* Row 1: Calendar Date Custom Dropdown & Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-xs ${
                isDropdownOpen
                  ? 'bg-white border-brand-500 ring-2 ring-brand-500/20 text-slate-900'
                  : 'bg-slate-50/90 hover:bg-slate-100 border-slate-300/80 text-slate-800'
              }`}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1 sm:p-1.5 rounded-lg shrink-0 ${
                    isSelectedToday
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200/70 text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-slate-900 truncate text-xs sm:text-sm">
                    {selectedDate === 'All' ? 'All Upcoming Dates' : selectedSchedule?.label || selectedDate}
                  </span>
                  {isSelectedToday && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                      Today
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-slate-400 ml-1">
                {selectedSchedule && (
                  <span className="hidden xs:inline-block text-[11px] font-bold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded-md">
                    {selectedSchedule.items.length} options
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 text-slate-500 ${
                    isDropdownOpen ? 'rotate-180 text-brand-600' : ''
                  }`}
                />
              </div>
            </button>

            {/* Modern Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[290px] xs:w-[330px] sm:w-[360px] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Select Menu Date</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{schedules.length} dates available</span>
                </div>

                <div className="max-h-[300px] overflow-y-auto py-1 space-y-0.5">
                  {/* All Dates option */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate('All');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                      selectedDate === 'All'
                        ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200/60'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          selectedDate === 'All' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        All
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">All Upcoming Dates</div>
                        <div className="text-[11px] text-slate-500">Show full multi-day menu schedule</div>
                      </div>
                    </div>
                    {selectedDate === 'All' && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* List of Schedules */}
                  {schedules.map((s) => {
                    const isSelected = selectedDate === s.date;
                    const isToday = s.date === todayStr;

                    const parts = s.label.split(',');
                    const dayName = parts[0]?.trim() || '';
                    const dateMonth = parts[1]?.trim() || '';
                    const dayShort = dayName.slice(0, 3).toUpperCase();
                    const dayNum = dateMonth.split(' ')[1] || s.date.split('-')[2];

                    return (
                      <button
                        key={s.date}
                        type="button"
                        onClick={() => {
                          onSelectDate(s.date);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200/60'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Mini Calendar Date Tile */}
                          <div
                            className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center border shrink-0 text-center leading-none ${
                              isSelected
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : isToday
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`text-[8px] font-extrabold uppercase tracking-tight ${
                                isSelected ? 'text-white/80' : isToday ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {dayShort}
                            </span>
                            <span className="text-[12px] font-black mt-0.5">{dayNum}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">{dayName}</span>
                              {isToday && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {dateMonth} • {s.items.length} options
                            </div>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              const isToday = s.date === todayStr;
              const short = s.label.split(',')[0].slice(0, 3) + ' ' + (s.label.split(',')[1] || '').trim();
              return (
                <button
                  key={s.date}
                  onClick={() => onSelectDate(s.date)}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {isToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  <span>{isToday ? `Today (${s.date.split('-')[2]})` : short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Filter by 3 Stalls (Malay, Chinese, International) */}
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
            <span>All Stalls</span>
          </button>

          {/* Filter out drinks stall and order stalls: Malay, Chinese, International */}
          {['malay', 'chinese', 'international']
            .map((id) => shops.find((s) => s.id === id))
            .filter((shop): shop is Shop => Boolean(shop))
            .map((shop) => {
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
