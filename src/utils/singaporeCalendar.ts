// Singapore Gazetted Public Holidays for 2026 and 2027 (Ministry of Manpower)
export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const SINGAPORE_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year (Day 1)' },
  { date: '2026-02-18', name: 'Chinese New Year (Day 2)' },
  { date: '2026-03-20', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-06-01', name: 'Vesak Day (Observed)' }, // 31 May is Sunday
  { date: '2026-08-10', name: 'National Day (Observed)' }, // 9 Aug is Sunday
  { date: '2026-11-09', name: 'Deepavali (Observed)' }, // 8 Nov is Sunday
  { date: '2026-12-25', name: 'Christmas Day' },

  // 2027
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-02-06', name: 'Chinese New Year (Day 1)' },
  { date: '2027-02-07', name: 'Chinese New Year (Day 2)' },
  { date: '2027-02-08', name: 'Chinese New Year (Observed)' },
  { date: '2027-03-10', name: 'Hari Raya Puasa' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-05-01', name: 'Labour Day' },
  { date: '2027-05-17', name: 'Hari Raya Haji' },
  { date: '2027-05-20', name: 'Vesak Day' },
  { date: '2027-08-09', name: 'National Day' },
  { date: '2027-10-29', name: 'Deepavali' },
  { date: '2027-12-25', name: 'Christmas Day' }
];

export interface AllowanceCycle {
  id: string; // e.g. "2026-09-27_2026-10-26"
  label: string; // e.g. "27 Sep 2026 – 26 Oct 2026"
  startDate: string; // YYYY-MM-DD (27th)
  endDate: string; // YYYY-MM-DD (26th)
  isCurrent: boolean;
}

/**
 * Returns available allowance cycles (previous, current, and upcoming)
 * Cycle is strictly 27th of Month M to 26th of Month M+1
 */
export function getAllowanceCycles(refDate: Date = new Date()): AllowanceCycle[] {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-indexed (9 = Oct)
  const currentDay = refDate.getDate();

  // If day >= 27, current cycle starts on 27th of currentMonth and ends on 26th of currentMonth + 1
  // If day < 27, current cycle starts on 27th of currentMonth - 1 and ends on 26th of currentMonth
  const baseMonth = currentDay >= 27 ? currentMonth : currentMonth - 1;

  // We generate 3 cycles: previous, current, next
  const offsets = [-1, 0, 1];

  return offsets.map((offset) => {
    const startObj = new Date(currentYear, baseMonth + offset, 27);
    const endObj = new Date(currentYear, baseMonth + offset + 1, 26);

    const startY = startObj.getFullYear();
    const startM = String(startObj.getMonth() + 1).padStart(2, '0');
    const startD = String(startObj.getDate()).padStart(2, '0');
    const startDate = `${startY}-${startM}-${startD}`;

    const endY = endObj.getFullYear();
    const endM = String(endObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endObj.getDate()).padStart(2, '0');
    const endDate = `${endY}-${endM}-${endD}`;

    const startLabel = startObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const endLabel = endObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      id: `${startDate}_${endDate}`,
      label: `${startLabel} – ${endLabel}`,
      startDate,
      endDate,
      isCurrent: offset === 0
    };
  });
}

export interface CycleWorkingDaysInfo {
  totalCalendarDays: number;
  weekendDays: number;
  publicHolidayDays: number;
  publicHolidaysInCycle: PublicHoliday[];
  workingDays: number;
}

/**
 * Calculates working days between startDate (YYYY-MM-DD) and endDate (YYYY-MM-DD) inclusive
 * Excludes weekends (Saturday, Sunday) and weekday Singapore Public Holidays
 */
export function calculateCycleWorkingDays(startDateStr: string, endDateStr: string): CycleWorkingDaysInfo {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const holidayMap = new Map<string, string>();
  SINGAPORE_PUBLIC_HOLIDAYS.forEach((h) => holidayMap.set(h.date, h.name));

  let totalCalendarDays = 0;
  let weekendDays = 0;
  let publicHolidayDays = 0;
  let workingDays = 0;
  const holidaysInCycle: PublicHoliday[] = [];

  const current = new Date(start);
  while (current <= end) {
    totalCalendarDays++;
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    } else if (holidayMap.has(isoDate)) {
      publicHolidayDays++;
      holidaysInCycle.push({ date: isoDate, name: holidayMap.get(isoDate)! });
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalCalendarDays,
    weekendDays,
    publicHolidayDays,
    publicHolidaysInCycle: holidaysInCycle,
    workingDays
  };
}

export interface AllowanceResult {
  totalAllocation: number; // usually $100
  workingDays: number;
  dailyRate: number; // totalAllocation / workingDays
  dailyRateFormatted: string;
  leaveDays: number;
  leaveDeduction: number;
  leaveDeductionFormatted: string;
  eligibleDays: number;
  remainingAllowance: number;
  remainingAllowanceFormatted: string;
}

/**
 * Calculate remaining allowance based on $100 allocation and leave days taken
 */
export function calculateAllowance(workingDays: number, leaveDays: number, totalAllocation: number = 100): AllowanceResult {
  const safeWorkingDays = Math.max(1, workingDays);
  const safeLeaveDays = Math.max(0, Math.min(leaveDays, safeWorkingDays));

  // Daily rate is $100 divided by total working days
  const dailyRate = totalAllocation / safeWorkingDays;
  const leaveDeduction = safeLeaveDays * dailyRate;
  const eligibleDays = safeWorkingDays - safeLeaveDays;
  const remainingAllowance = eligibleDays * dailyRate;

  return {
    totalAllocation,
    workingDays: safeWorkingDays,
    dailyRate,
    dailyRateFormatted: `$${dailyRate.toFixed(2)}`,
    leaveDays: safeLeaveDays,
    leaveDeduction,
    leaveDeductionFormatted: `$${leaveDeduction.toFixed(2)}`,
    eligibleDays,
    remainingAllowance,
    remainingAllowanceFormatted: `$${remainingAllowance.toFixed(2)}`
  };
}
