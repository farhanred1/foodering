import React, { useState, useMemo, useEffect } from 'react';
import { X, Calculator, Info, Plus, Minus, Calendar, AlertCircle, Utensils, RotateCcw, Check, Sparkles } from 'lucide-react';
import {
  getAllowanceCycles,
  calculateCycleWorkingDays,
  calculateAllowance,
  normalizeToIso
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
  const [customFoodSpent, setCustomFoodSpent] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.id === selectedCycleId) || cycles[0];
  }, [cycles, selectedCycleId]);

  // Reset custom adjustments when switching cycles
  useEffect(() => {
    setCustomFoodSpent(null);
    setLeaveDays(0);
  }, [selectedCycleId]);

  // Working days and Singapore Public Holidays for the selected cycle
  const cycleDaysInfo = useMemo(() => {
    return calculateCycleWorkingDays(activeCycle.startDate, activeCycle.endDate);
  }, [activeCycle]);

  // Orders placed in this cycle (between 27th and 26th)
  const cycleOrders = useMemo(() => {
    return orders.filter((o) => {
      const iso = normalizeToIso(o.mealDate) || normalizeToIso(o.datePlaced);
      if (!iso) return false;
      return iso >= activeCycle.startDate && iso <= activeCycle.endDate;
    });
  }, [orders, activeCycle]);

  // Actual food total from user's orders
  const actualCycleFoodTotal = useMemo(() => {
    const total = cycleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return parseFloat(total.toFixed(2));
  }, [cycleOrders]);

  // Effective food spent (uses user-adjusted value if modified, else actual orders)
  const effectiveFoodSpent = customFoodSpent !== null ? customFoodSpent : actualCycleFoodTotal;

  // Allowance calculation accounting for leave
  const allowanceCalc = useMemo(() => {
    return calculateAllowance(cycleDaysInfo.workingDays, leaveDays, 100);
  }, [cycleDaysInfo.workingDays, leaveDays]);

  // 1. Allowance left accounting for leave
  const allowanceAfterLeave = allowanceCalc.remainingAllowance;

  // 2. Net balance left accounting for leave AND food ordered
  const balanceAfterFood = parseFloat((allowanceAfterLeave - effectiveFoodSpent).toFixed(2));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden z-10 flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        
        {/* Minimal Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base block leading-tight">
                Allowance & Food Balance
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Accounting for Leave & Food Ordered
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* Collapsible Info Popover (only visible when (i) clicked) */}
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Billing Cycle (27th – 26th)
              </label>
              <span className="text-[10px] text-slate-400">
                {cycleDaysInfo.workingDays} working days ({allowanceCalc.dailyRateFormatted}/day)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {cycles.filter((c) => !c.id.includes('2026-08')).map((c) => {
                const isSelected = c.id === selectedCycleId;
                const shortLabel = c.label.replace('2026', '').replace('2027', '').trim();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCycleId(c.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
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
          </div>

          {/* Holiday Note if present in cycle */}
          {cycleDaysInfo.publicHolidaysInCycle.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Public Holiday: {cycleDaysInfo.publicHolidaysInCycle.map((h) => `${h.name} (${h.date.slice(5)})`).join(', ')}
              </span>
            </div>
          )}

          {/* Section 1: Leave Days Input */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  1. Leave Days Taken
                </span>
                <span className="text-[11px] text-slate-400">
                  Deducts {allowanceCalc.dailyRateFormatted} per working day
                </span>
              </div>

              {/* Stepper controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeaveDays((prev) => Math.max(0, prev - 1))}
                  disabled={leaveDays <= 0}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <div className="w-10 text-center font-black text-slate-900 text-sm">
                  {leaveDays}d
                </div>

                <button
                  type="button"
                  onClick={() => setLeaveDays((prev) => Math.min(cycleDaysInfo.workingDays, prev + 1))}
                  disabled={leaveDays >= cycleDaysInfo.workingDays}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Leave Pills */}
            <div className="flex items-center gap-1 pt-0.5">
              {[0, 1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLeaveDays(d)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    leaveDays === d
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200'
                  }`}
                >
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Food Ordered in Cycle Input */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    2. Food Ordered in Cycle
                  </span>
                  {cycleOrders.length > 0 && customFoodSpent === null && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                      {cycleOrders.length} meals ordered
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {customFoodSpent !== null
                    ? 'Custom simulated food spend'
                    : `Auto-calculated from your ${cycleOrders.length} meal orders`}
                </span>
              </div>

              {/* Food Amount Stepper / Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomFoodSpent(Math.max(0, parseFloat((effectiveFoodSpent - 1).toFixed(2))))}
                  disabled={effectiveFoodSpent <= 0}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Minus $1"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <div className="min-w-16 text-center font-black text-slate-900 text-sm">
                  ${effectiveFoodSpent.toFixed(2)}
                </div>

                <button
                  type="button"
                  onClick={() => setCustomFoodSpent(parseFloat((effectiveFoodSpent + 1).toFixed(2)))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Plus $1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick spend pills & Reset */}
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <div className="flex items-center gap-1">
                {[0, 15, 25, 35, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomFoodSpent(amt)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      effectiveFoodSpent === amt
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {customFoodSpent !== null && (
                <button
                  type="button"
                  onClick={() => setCustomFoodSpent(null)}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-800 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to Actual (${actualCycleFoodTotal.toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>

          {/* TWO PRIMARY RESULTS CARDS */}
          <div className="space-y-2.5 pt-1">
            
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
                  {leaveDays > 0 ? (
                    <span>$100.00 − {allowanceCalc.leaveDeductionFormatted} ({leaveDays}d leave)</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Full $100.00 allowance (0d leave)</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. NET BALANCE LEFT ACCOUNTING FOR FOOD ORDERED */}
            <div className={`p-4 rounded-2xl shadow-md border ${
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
                    Food: <span className="font-bold text-rose-300">-${effectiveFoodSpent.toFixed(2)}</span>
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
