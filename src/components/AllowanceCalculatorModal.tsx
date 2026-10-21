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
  Wallet,
  ShoppingBag,
  Palmtree,
  CalendarDays
} from 'lucide-react';
import {
  getAllowanceCycles,
  calculateCycleWorkingDays,
  calculateAllowance,
  buildCycleCalendar,
  CycleCalendarDay,
  normalizeToIso
} from '../utils/singaporeCalendar';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';

interface AllowanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllowanceCalculatorModal: React.FC<AllowanceCalculatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const { orders, walletBalance, walletTransactions } = useOrders();
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

  // Daily rate for the cycle ($100 / working days)
  const dailyRate = useMemo(() => {
    return 100 / Math.max(1, cycleDaysInfo.workingDays);
  }, [cycleDaysInfo.workingDays]);

  // Effective leave count
  const effectiveLeaveCount = Math.max(leaveDays, leaveDates.length);
  const leaveMoney = parseFloat((effectiveLeaveCount * dailyRate).toFixed(2));

  // Build the complete calendar day array with status for each date
  const { days: calendarDays, leadBlankDays } = useMemo(() => {
    return buildCycleCalendar(
      activeCycle.startDate,
      activeCycle.endDate,
      orders,
      walletTransactions,
      leaveDates,
      todayStr
    );
  }, [activeCycle, orders, walletTransactions, leaveDates, todayStr]);

  // Food ordered in cycle from today until the 26th
  const upcomingCycleOrders = useMemo(() => {
    return orders.filter((o) => {
      const iso = normalizeToIso(o.mealDate) || normalizeToIso(o.datePlaced);
      if (!iso) return false;
      return iso >= todayStr && iso <= activeCycle.endDate;
    });
  }, [orders, todayStr, activeCycle.endDate]);

  const foodOrderedUntil26th = useMemo(() => {
    const sum = upcomingCycleOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    return parseFloat(sum.toFixed(2));
  }, [upcomingCycleOrders]);

  // Summary counts from the calendar
  const calendarStats = useMemo(() => {
    let claimedCount = 0;
    let directPurchaseCount = 0;
    let upcomingOrderedCount = 0;
    let upcomingNotOrderedCount = 0;
    let passedNoOrderCount = 0;

    calendarDays.forEach((d) => {
      if (d.status === 'passed_claimed') {
        claimedCount++;
      } else if (d.status === 'walkin_purchase') {
        directPurchaseCount++;
      } else if (d.status === 'today_ordered' || d.status === 'upcoming_ordered') {
        upcomingOrderedCount++;
      } else if (d.status === 'upcoming_not_ordered' || d.status === 'today_not_ordered') {
        upcomingNotOrderedCount++;
      } else if (d.status === 'passed_no_order') {
        passedNoOrderCount++;
      }
    });

    return {
      claimedCount,
      directPurchaseCount,
      upcomingOrderedCount,
      upcomingNotOrderedCount,
      passedNoOrderCount,
      totalOrderedCount: claimedCount + upcomingOrderedCount
    };
  }, [calendarDays]);

  // Current wallet balance or default monthly cycle allowance ($100.00)
  const currentWallet = walletBalance ?? 100.0;

  // User requirement 1: Allowance left = Current wallet balance minus leave days money
  const allowanceLeft = parseFloat((currentWallet - leaveMoney).toFixed(2));

  // User requirement 2: Remaining balance = Current balance - leave days money - order food until 26th
  const remainingBalance = parseFloat((allowanceLeft - foodOrderedUntil26th).toFixed(2));

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
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden z-10 flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        
        {/* Minimal Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm block leading-tight">
                Allowance & Balance Calculator
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {user?.displayName ? `${user.displayName} • ` : ''}Wallet, Leave & Food Orders Until 26th
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Clickable (i) info button */}
            <button
              type="button"
              onClick={() => setShowInfo((prev) => !prev)}
              aria-label="Calculation explanation"
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
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto">
          
          {/* Collapsible Info Popover */}
          {showInfo && (
            <div className="p-2.5 bg-indigo-50/90 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950 text-[11px]">
                <AlertCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>Calculation Formulas</span>
              </div>
              <p className="text-[10px] leading-relaxed text-indigo-900/90">
                • <strong>Daily Rate</strong>: $100 ÷ {cycleDaysInfo.workingDays} working days = ${dailyRate.toFixed(2)}/day.
                <br />
                • <strong>Allowance Left</strong> = Current Wallet (${currentWallet.toFixed(2)}) − Leave Days Money.
                <br />
                • <strong>Remaining Balance</strong> = Current Wallet − Leave Days Money − Food Ordered until 26th.
              </p>
            </div>
          )}

          {/* Cycle & Wallet Status Bar */}
          <div className="flex items-center justify-between gap-2 p-1 bg-slate-100 rounded-xl">
            {cycles.filter((c) => !c.id.includes('2026-08')).map((c) => {
              const isSelected = c.id === selectedCycleId;
              const shortLabel = c.label.replace('2026', '').replace('2027', '').trim();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCycleId(c.id)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div>{shortLabel}</div>
                  <div className="text-[9px] font-normal text-slate-400">
                    {c.isCurrent ? 'Current Cycle' : 'Next Cycle'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Header Row: Live Wallet Balance & Working Days */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Current Wallet
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900">
                ${currentWallet.toFixed(2)}
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Daily Rate
              </span>
              <span className="text-xs sm:text-sm font-black text-indigo-700">
                ${dailyRate.toFixed(2)}/d
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Food Until 26th
              </span>
              <span className="text-xs sm:text-sm font-black text-brand-700">
                -${foodOrderedUntil26th.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Leave Days Stepper */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Leave Days Taken
              </span>
              <span className="text-[10px] text-slate-400">
                Deducts -${dailyRate.toFixed(2)}/day (or tap days on calendar)
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
                className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Minus className="w-3 h-3" />
              </button>

              <div className="w-8 text-center font-black text-slate-900 text-xs">
                {effectiveLeaveCount}d
              </div>

              <button
                type="button"
                onClick={() => {
                  setLeaveDays((prev) => Math.min(cycleDaysInfo.workingDays, prev + 1));
                  setLeaveDates([]);
                }}
                disabled={effectiveLeaveCount >= cycleDaysInfo.workingDays}
                className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* COMPACT CALENDAR STATUS VIEW */}
          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-extrabold text-slate-900">
                  Cycle Calendar (27th – 26th)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                {upcomingCycleOrders.length} meals pre-ordered until 26th (${foodOrderedUntil26th.toFixed(2)})
              </span>
            </div>

            {/* 7-Day Header */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400 pb-0.5 border-b border-slate-200">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span className="text-slate-300">S</span>
              <span className="text-slate-300">S</span>
            </div>

            {/* Compact Day Grid */}
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {/* Leading blank slots */}
              {Array.from({ length: leadBlankDays }).map((_, idx) => (
                <div key={`blank-${idx}`} className="w-full h-6 sm:h-7" />
              ))}

              {/* Cycle Days */}
              {calendarDays.map((day) => {
                const isSelected = selectedDayDetail?.date === day.date;
                
                let cellClass = '';
                let dotIcon: React.ReactNode = null;

                switch (day.status) {
                  case 'passed_claimed':
                    cellClass = 'bg-emerald-600 text-white font-bold';
                    dotIcon = <span className="w-1 h-1 rounded-full bg-emerald-200 inline-block" />;
                    break;
                  case 'walkin_purchase':
                    cellClass = 'bg-amber-500 text-white font-bold';
                    dotIcon = <span className="w-1 h-1 rounded-full bg-amber-100 inline-block" />;
                    break;
                  case 'today_ordered':
                    cellClass = 'bg-emerald-700 text-white font-black ring-1 ring-emerald-500';
                    dotIcon = <span className="w-1 h-1 rounded-full bg-white inline-block animate-pulse" />;
                    break;
                  case 'today_not_ordered':
                    cellClass = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                    break;
                  case 'upcoming_ordered':
                    cellClass = 'bg-brand-600 text-white font-bold';
                    dotIcon = <span className="w-1 h-1 rounded-full bg-brand-200 inline-block" />;
                    break;
                  case 'upcoming_not_ordered':
                    cellClass = 'bg-white text-slate-700 border border-dashed border-slate-300 hover:border-brand-500 font-semibold';
                    break;
                  case 'passed_no_order':
                    cellClass = 'bg-slate-200/50 text-slate-400 line-through';
                    break;
                  case 'leave':
                    cellClass = 'bg-purple-600 text-white font-black';
                    dotIcon = <span className="w-1 h-1 rounded-full bg-purple-200 inline-block" />;
                    break;
                  case 'holiday':
                    cellClass = 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold';
                    break;
                  case 'weekend':
                  default:
                    cellClass = 'bg-slate-100/30 text-slate-300';
                    break;
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => handleToggleDayLeave(day)}
                    className={`h-6 sm:h-7 rounded-md flex flex-col items-center justify-center text-[10px] transition-all cursor-pointer ${cellClass} ${
                      isSelected ? 'ring-2 ring-slate-900 scale-105 z-10' : ''
                    }`}
                    title={`${day.date}: ${day.statusLabel}`}
                  >
                    <span className="leading-none text-[9px] sm:text-[10px]">{day.dayNum}</span>
                    {dotIcon && <span className="leading-none mt-0.5">{dotIcon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Detail Popover / Bar */}
            {selectedDayDetail && (
              <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-[10px] flex items-center justify-between animate-in fade-in duration-100">
                <span className="font-bold text-slate-900 truncate">
                  {new Date(selectedDayDetail.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}: {selectedDayDetail.statusLabel}
                </span>
                {selectedDayDetail.isWorkingDay && (
                  <span className="text-indigo-600 font-bold shrink-0 ml-1">
                    {leaveDates.includes(selectedDayDetail.date) ? '✓ Leave' : 'Tap to mark leave'}
                  </span>
                )}
              </div>
            )}

            {/* Compact Legend Bar */}
            <div className="pt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-500 font-medium">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-emerald-600 inline-block shrink-0" />
                <span>Pre-ordered Claimed ({calendarStats.claimedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block shrink-0" />
                <span>Direct Purchase ({calendarStats.directPurchaseCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-brand-600 inline-block shrink-0" />
                <span>Pre-ordered ({calendarStats.upcomingOrderedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-white border border-dashed border-slate-400 inline-block shrink-0" />
                <span>Not Placed ({calendarStats.upcomingNotOrderedCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-purple-600 inline-block shrink-0" />
                <span>Leave ({leaveDates.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-slate-200 inline-block shrink-0" />
                <span>No Purchase ({calendarStats.passedNoOrderCount})</span>
              </div>
            </div>
          </div>

          {/* TWO PRIMARY RESULTS CARDS (User Defined Math) */}
          <div className="space-y-2 pt-0.5">
            
            {/* 1. ALLOWANCE LEFT = Current Wallet Balance - Leave Days Money */}
            <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-xs border border-slate-800">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                  1. Allowance Left (Wallet − Leave)
                </span>
                <span className="text-[9px] text-indigo-200 bg-white/10 px-1.5 py-0.2 rounded-full">
                  Wallet ${currentWallet.toFixed(2)} − Leave ${leaveMoney.toFixed(2)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-black text-white">
                  ${allowanceLeft.toFixed(2)}
                </div>
                <div className="text-right text-[10px] text-indigo-200">
                  {effectiveLeaveCount > 0 ? (
                    <span>${currentWallet.toFixed(2)} − ${leaveMoney.toFixed(2)} ({effectiveLeaveCount}d leave)</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">${currentWallet.toFixed(2)} (0 days leave taken)</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. REMAINING BALANCE = Current Balance - Leave Days Money - Food Ordered until 26th */}
            <div className={`p-3.5 rounded-xl shadow-md border ${
              remainingBalance >= 0
                ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30 text-white'
                : 'bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 border-rose-500/30 text-white'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                  2. Remaining Balance (Until 26th)
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  remainingBalance >= 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {remainingBalance >= 0 ? 'Surplus Left' : 'Allowance Exceeded'}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ${Math.abs(remainingBalance).toFixed(2)}
                  </div>
                  <span className="text-[9px] text-slate-300 mt-0.5 block">
                    {remainingBalance >= 0
                      ? 'Net surplus left after leave and food pre-orders until 26th'
                      : 'Exceeded budget; excess payable out of pocket'}
                  </span>
                </div>

                <div className="text-right text-[10px] space-y-0.5">
                  <div className="text-slate-300">
                    Wallet: <span className="font-bold text-white">${currentWallet.toFixed(2)}</span>
                  </div>
                  <div className="text-indigo-200">
                    Leave: <span className="font-bold text-indigo-300">-${leaveMoney.toFixed(2)}</span>
                  </div>
                  <div className="text-rose-300">
                    Food until 26th: <span className="font-bold text-rose-300">-${foodOrderedUntil26th.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
