import React, { useState, useMemo } from 'react';
import { X, Calculator, Info, Plus, Minus, Calendar, Check, AlertCircle } from 'lucide-react';
import {
  getAllowanceCycles,
  calculateCycleWorkingDays,
  calculateAllowance,
  AllowanceCycle
} from '../utils/singaporeCalendar';

interface AllowanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllowanceCalculatorModal: React.FC<AllowanceCalculatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const cycles = useMemo(() => getAllowanceCycles(), []);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => {
    const current = cycles.find((c) => c.isCurrent);
    return current ? current.id : cycles[0].id;
  });
  const [leaveDays, setLeaveDays] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.id === selectedCycleId) || cycles[0];
  }, [cycles, selectedCycleId]);

  const cycleDaysInfo = useMemo(() => {
    return calculateCycleWorkingDays(activeCycle.startDate, activeCycle.endDate);
  }, [activeCycle]);

  const calculation = useMemo(() => {
    return calculateAllowance(cycleDaysInfo.workingDays, leaveDays, 100);
  }, [cycleDaysInfo.workingDays, leaveDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden z-10 flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Minimal Header (No bulky title) */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
              Allowance Calculator
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Clickable (i) button that toggles policy explanation */}
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
        <div className="p-5 space-y-4 overflow-y-auto max-h-[85vh]">
          
          {/* Collapsible Info Popover (only shown if (i) button is clicked) */}
          {showInfo && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Allowance Policy & Calculation</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-900/90">
                • $100 is allocated per cycle from the <strong>27th of one month to the 26th of the next</strong>.
                <br />
                • Weekends and gazetted Singapore Public Holidays are non-working days.
                <br />
                • Daily rate is <strong>$100 ÷ Working Days</strong>. Taking leave deducts that day's allocated allowance.
              </p>
            </div>
          )}

          {/* Cycle Selection Tabs (27th to 26th) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Billing Cycle (27th – 26th)
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {cycles.filter((c) => !c.id.includes('2026-08')).map((c) => {
                const isSelected = c.id === selectedCycleId;
                const shortLabel = c.label.replace('2026', '').replace('2027', '').trim();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCycleId(c.id);
                      setLeaveDays(0);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div>{shortLabel}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {c.isCurrent ? 'Current Cycle' : 'Next Cycle'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Cycle Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Allocation
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900">
                $100.00
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Working Days
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-700">
                {cycleDaysInfo.workingDays} Days
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Daily Rate
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700">
                {calculation.dailyRateFormatted}
              </span>
            </div>
          </div>

          {/* Holiday Note if holiday falls in cycle */}
          {cycleDaysInfo.publicHolidaysInCycle.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] font-medium">
              <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
              <span>
                Public Holiday: {cycleDaysInfo.publicHolidaysInCycle.map((h) => `${h.name} (${h.date.slice(5)})`).join(', ')}
              </span>
            </div>
          )}

          {/* Leave Days Counter Input */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Leave Taken
                </span>
                <span className="text-[11px] text-slate-400">
                  Days absent on working days
                </span>
              </div>

              {/* Stepper controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveDays((prev) => Math.max(0, prev - 1))}
                  disabled={leaveDays <= 0}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-12 text-center font-black text-slate-900 text-base">
                  {leaveDays}
                </div>

                <button
                  type="button"
                  onClick={() => setLeaveDays((prev) => Math.min(cycleDaysInfo.workingDays, prev + 1))}
                  disabled={leaveDays >= cycleDaysInfo.workingDays}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Leave Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {[0, 1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLeaveDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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

          {/* Dynamic Result Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span>Leave Deduction ({leaveDays} × {calculation.dailyRateFormatted})</span>
              <span className="font-extrabold text-rose-300">
                {leaveDays > 0 ? `-${calculation.leaveDeductionFormatted}` : '$0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span>Working Days Entitled</span>
              <span className="font-bold text-white">
                {calculation.eligibleDays} of {cycleDaysInfo.workingDays} days
              </span>
            </div>

            <div className="pt-2 border-t border-indigo-700/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block">
                  Remaining Allowance
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {calculation.remainingAllowanceFormatted}
                </span>
              </div>

              <div className="text-right">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {leaveDays === 0 ? 'Full Subsidy' : `${calculation.eligibleDays} Days Subsidized`}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
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
