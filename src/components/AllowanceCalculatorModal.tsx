import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calculator,
  Info,
  Plus,
  Minus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Palmtree,
  CalendarDays
} from 'lucide-react';
import {
  getAllowanceCycles,
  calculateCycleWorkingDays,
  calculateAllowance,
  buildCycleCalendar,
  CycleCalendarDay
} from '../utils/singaporeCalendar';
import { useOrders } from '../context/OrdersContext';

interface AllowanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllowanceCalculatorModal: React.FC<AllowanceCalculatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { orders } = useOrders();
  const cycles = useMemo(() => getAllowanceCycles(), []);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => {
    const current = cycles.find((c) => c.isCurrent);
    return current ? current.id : cycles[0].id;
  });

  const [leaveDays, setLeaveDays] = useState<number>(0);
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<CycleCalendarDay | null>(null);

  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.id === selectedCycleId) || cycles[0];
  }, [cycles, selectedCycleId]);

  // Reset custom adjustments when switching cycles
  useEffect(() => {
    setLeaveDays(0);
    setLeaveDates([]);
    setSelectedDayDetail(null);
  }, [selectedCycleId]);

  // Today's ISO date string
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Working days and Singapore Public Holidays for the selected cycle
  const cycleDaysInfo = useMemo(() => {
    return calculateCycleWorkingDays(activeCycle.startDate, activeCycle.endDate);
  }, [activeCycle]);

  // Build the complete calendar day array with status for each date
  const { days: calendarDays, leadBlankDays } = useMemo(() => {
    return buildCycleCalendar(
      activeCycle.startDate,
      activeCycle.endDate,
      orders,
      leaveDates,
      todayStr
    );
  }, [activeCycle, orders, leaveDates, todayStr]);

  // Summary counts from the calendar
  const calendarStats = useMemo(() => {
    let claimedCount = 0;
    let upcomingOrderedCount = 0;
    let upcomingNotOrderedCount = 0;
    let passedNoOrderCount = 0;
    let foodTotal = 0;

    calendarDays.forEach((d) => {
      if (d.status === 'passed_claimed') {
        claimedCount++;
        foodTotal += d.orderTotal || 0;
      } else if (d.status === 'today_ordered' || d.status === 'upcoming_ordered') {
        upcomingOrderedCount++;
        foodTotal += d.orderTotal || 0;
      } else if (d.status === 'upcoming_not_ordered' || d.status === 'today_not_ordered') {
        upcomingNotOrderedCount++;
      } else if (d.status === 'passed_no_order') {
        passedNoOrderCount++;
      }
    });

    return {
      claimedCount,
      upcomingOrderedCount,
      upcomingNotOrderedCount,
      passedNoOrderCount,
      totalOrderedCount: claimedCount + upcomingOrderedCount,
      foodTotal: parseFloat(foodTotal.toFixed(2))
    };
  }, [calendarDays]);

  // Allowance calculation accounting for leave
  const effectiveLeaveCount = Math.max(leaveDays, leaveDates.length);
  const allowanceCalc = useMemo(() => {
    return calculateAllowance(cycleDaysInfo.workingDays, effectiveLeaveCount, 100);
  }, [cycleDaysInfo.workingDays, effectiveLeaveCount]);

  // 1. Allowance left accounting for leave
  const allowanceAfterLeave = allowanceCalc.remainingAllowance;

  // 2. Net balance left accounting for leave AND food ordered
  const balanceAfterFood = parseFloat((allowanceAfterLeave - calendarStats.foodTotal).toFixed(2));

  // Toggle leave on calendar day tap
  const handleToggleDayLeave = (day: CycleCalendarDay) => {
    if (day.isWeekend || day.isHoliday) {
      setSelectedDayDetail(day);
      return;
    }

    setSelectedDayDetail(day);
    if (leaveDates.includes(day.date)) {
      const updated = leaveDates.filter((d) => d !== day.date);
      setLeaveDates(updated);
      setLeaveDays(updated.length);
    } else {
      const updated = [...leaveDates, day.date];
      setLeaveDates(updated);
      setLeaveDays(updated.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden z-10 flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[94vh]">
        
        {/* Minimal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base block leading-tight">
                Allowance & Calendar Status
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Leave Deductions & Food Order Tracker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Clickable (i) info button */}
            <button
              type="button"
              onClick={() => setShowInfo((prev) => !prev)}
              aria-label="Allowance policy details"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                showInfo
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
              title="Click for calculation details"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto">
          
          {/* Collapsible Info Popover */}
          {showInfo && (
            <div className="p-3 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>How This Calculation Works</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900/90">
                • <strong>Monthly Cycle</strong>: 27th of one month to 26th of the next with $100 allocation.
                <br />
                • <strong>Working Days</strong>: Weekdays excluding Singapore gazetted public holidays.
                <br />
                • <strong>1. Balance after Leave</strong> = $100 − (Leave Days × Daily Rate).
                <br />
                • <strong>2. Balance after Food</strong> = (Balance after Leave) − (Total Food Ordered in Cycle).
              </p>
            </div>
          )}

          {/* Cycle Selector (27th to 26th) */}
          <div className="flex items-center justify-between gap-2 p-1 bg-slate-100 rounded-2xl">
            {cycles.filter((c) => !c.id.includes('2026-08')).map((c) => {
              const isSelected = c.id === selectedCycleId;
              const shortLabel = c.label.replace('2026', '').replace('2027', '').trim();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCycleId(c.id)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div>{shortLabel}</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    {c.isCurrent ? 'Current Active Cycle' : 'Next Cycle'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Leave Days Stepper */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Leave Days Taken
              </span>
              <span className="text-[10px] text-slate-400">
                Deducts {allowanceCalc.dailyRateFormatted}/day (or tap days below)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLeaveDays((prev) => Math.max(0, prev - 1));
                  setLeaveDates([]);
                }}
                disabled={effectiveLeaveCount <= 0}
                className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Minus className="w-3 h-3" />
              </button>

              <div className="w-10 text-center font-black text-slate-900 text-xs">
                {effectiveLeaveCount}d
              </div>

              <button
                type="button"
                onClick={() => {
                  setLeaveDays((prev) => Math.min(cycleDaysInfo.workingDays, prev + 1));
                  setLeaveDates([]);
                }}
                disabled={effectiveLeaveCount >= cycleDaysInfo.workingDays}
                className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* CALENDAR STATUS VIEW (Small Colored Calendar) */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  Cycle Meal Status Calendar
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                {calendarStats.totalOrderedCount} meals ordered (${calendarStats.foodTotal.toFixed(2)})
              </span>
            </div>

            {/* 7-Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-slate-300">Sat</span>
              <span className="text-slate-300">Sun</span>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Leading blank slots */}
              {Array.from({ length: leadBlankDays }).map((_, idx) => (
                <div key={`blank-${idx}`} className="w-full aspect-square" />
              ))}

              {/* Cycle Days */}
              {calendarDays.map((day) => {
                const isSelected = selectedDayDetail?.date === day.date;
                
                // Color and style mapping
                let cellClass = '';
                let badgeIcon: React.ReactNode = null;

                switch (day.status) {
                  case 'passed_claimed':
                    // Passed day with order claimed/completed
                    cellClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                    badgeIcon = <CheckCircle2 className="w-2.5 h-2.5 inline text-emerald-200" />;
                    break;
                  case 'today_ordered':
                    // Today with order placed
                    cellClass = 'bg-emerald-700 text-white font-black ring-2 ring-emerald-500 shadow-sm';
                    badgeIcon = <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />;
                    break;
                  case 'today_not_ordered':
                    // Today without order placed
                    cellClass = 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400 font-black';
                    break;
                  case 'upcoming_ordered':
                    // Upcoming day with order confirmed
                    cellClass = 'bg-brand-600 text-white font-bold shadow-xs';
                    badgeIcon = <ShoppingBag className="w-2 h-2 inline text-brand-200" />;
                    break;
                  case 'upcoming_not_ordered':
                    // Upcoming day without order
                    cellClass = 'bg-white text-slate-700 border-2 border-dashed border-slate-300 hover:border-brand-500 font-bold';
                    break;
                  case 'passed_no_order':
                    // Passed weekday without order
                    cellClass = 'bg-slate-200/70 text-slate-400 line-through';
                    break;
                  case 'leave':
                    // Day marked as leave
                    cellClass = 'bg-purple-600 text-white font-black shadow-xs';
                    badgeIcon = <Palmtree className="w-2.5 h-2.5 inline text-purple-200" />;
                    break;
                  case 'holiday':
                    // Public holiday
                    cellClass = 'bg-amber-100 text-amber-900 border border-amber-200 font-semibold';
                    break;
                  case 'weekend':
                  default:
                    cellClass = 'bg-slate-100/40 text-slate-300';
                    break;
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => handleToggleDayLeave(day)}
                    className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center text-[11px] transition-all cursor-pointer ${cellClass} ${
                      isSelected ? 'ring-2 ring-slate-900 scale-105 z-10' : ''
                    }`}
                    title={`${day.date}: ${day.statusLabel}`}
                  >
                    <span className="leading-none">{day.dayNum}</span>
                    {badgeIcon && <span className="absolute bottom-0.5 leading-none">{badgeIcon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Detail Popover / Bar */}
            {selectedDayDetail && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">
                    {new Date(selectedDayDetail.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedDayDetail.statusLabel}
                  </span>
                </div>
                {selectedDayDetail.itemsSummary && (
                  <p className="text-[11px] text-slate-600 truncate">
                    Menu: {selectedDayDetail.itemsSummary}
                  </p>
                )}
                {selectedDayDetail.isWorkingDay && (
                  <div className="text-[10px] text-indigo-600 font-semibold pt-0.5">
                    {leaveDates.includes(selectedDayDetail.date)
                      ? '✓ Marked as Leave (Click again to remove)'
                      : 'Click to mark/unmark this day as leave'}
                  </div>
                )}
              </div>
            )}

            {/* Calendar Legend Bar */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-600 font-medium">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-600 inline-block shrink-0" />
                <span>Claimed ({calendarStats.claimedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-brand-600 inline-block shrink-0" />
                <span>Pre-ordered ({calendarStats.upcomingOrderedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-white border border-dashed border-slate-400 inline-block shrink-0" />
                <span>Not Placed ({calendarStats.upcomingNotOrderedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-purple-600 inline-block shrink-0" />
                <span>Leave ({leaveDates.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-slate-200 inline-block shrink-0" />
                <span>Passed No Order ({calendarStats.passedNoOrderCount})</span>
              </div>
            </div>
          </div>

          {/* TWO PRIMARY RESULTS CARDS */}
          <div className="space-y-2 pt-0.5">
            
            {/* 1. ALLOWANCE LEFT ACCOUNTING FOR LEAVE */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                  1. Allowance Left (Accounting for Leave)
                </span>
                <span className="text-[10px] text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full">
                  {allowanceCalc.eligibleDays} of {cycleDaysInfo.workingDays} days
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {allowanceCalc.remainingAllowanceFormatted}
                </div>
                <div className="text-right text-[11px] text-indigo-200">
                  {effectiveLeaveCount > 0 ? (
                    <span>$100.00 − {allowanceCalc.leaveDeductionFormatted} ({effectiveLeaveCount}d leave)</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Full $100.00 allowance (0d leave)</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. NET BALANCE LEFT ACCOUNTING FOR FOOD ORDERED */}
            <div className={`p-3.5 sm:p-4 rounded-2xl shadow-md border ${
              balanceAfterFood >= 0
                ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30 text-white'
                : 'bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 border-rose-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                  2. Remaining Balance (Accounting for Food)
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  balanceAfterFood >= 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {balanceAfterFood >= 0 ? 'Surplus Available' : 'Allowance Exceeded'}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    balanceAfterFood >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ${Math.abs(balanceAfterFood).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-300 mt-0.5 block">
                    {balanceAfterFood >= 0
                      ? 'Available subsidy left to spend on upcoming meals'
                      : 'Exceeded allowance; excess payable out of pocket'}
                  </span>
                </div>

                <div className="text-right text-xs space-y-0.5">
                  <div className="text-slate-300 text-[11px]">
                    Allowance: <span className="font-bold text-white">${allowanceAfterLeave.toFixed(2)}</span>
                  </div>
                  <div className="text-rose-300 text-[11px]">
                    Food: <span className="font-bold text-rose-300">-${calendarStats.foodTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
