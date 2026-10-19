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

export function normalizeToIso(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export type CycleDayStatus =
  | 'weekend'
  | 'holiday'
  | 'leave'
  | 'passed_claimed'
  | 'walkin_purchase'
  | 'passed_no_order'
  | 'today_ordered'
  | 'today_not_ordered'
  | 'upcoming_ordered'
  | 'upcoming_not_ordered';

export interface CycleCalendarDay {
  date: string; // YYYY-MM-DD
  dayNum: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
  isPassed: boolean;
  isUpcoming: boolean;
  isWorkingDay: boolean;
  status: CycleDayStatus;
  statusLabel: string;
  orderTotal?: number;
  orderNumber?: string;
  itemsSummary?: string;
  walletTxTotal?: number;
  walletTxDetails?: string;
}

export function buildCycleCalendar(
  startDateStr: string,
  endDateStr: string,
  orders: { mealDate?: string; datePlaced?: string; total?: number; status?: string; items?: any[]; orderNumber?: string; id?: any }[],
  transactions: { type?: string; amount?: number; date?: string; details?: string }[] = [],
  leaveDates: string[] = [],
  todayStr: string = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })()
): { days: CycleCalendarDay[]; leadBlankDays: number } {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  // Map public holidays
  const holidayMap = new Map<string, string>();
  SINGAPORE_PUBLIC_HOLIDAYS.forEach((h) => holidayMap.set(h.date, h.name));

  // Map orders by date
  // 1. Orders scheduled to be consumed on meal date
  const ordersByDate = new Map<string, { total: number; orderNumber: string; itemsSummary: string; status: string }>();
  // 2. Orders placed/paid on transaction date
  const ordersPlacedByDate = new Map<string, { total: number; count: number; orderNumbers: string[] }>();

  orders.forEach((o) => {
    const mealIso = normalizeToIso(o.mealDate);
    const placedIso = normalizeToIso(o.datePlaced);
    const targetIso = mealIso || placedIso;

    if (targetIso) {
      const existing = ordersByDate.get(targetIso);
      const total = o.total || 0;
      const itemsSummary = o.items ? o.items.map((i: any) => i.name).join(', ') : 'Lunch Set';
      if (existing) {
        existing.total += total;
        existing.itemsSummary += `; ${itemsSummary}`;
      } else {
        ordersByDate.set(targetIso, {
          total,
          orderNumber: String(o.orderNumber || o.id || ''),
          itemsSummary,
          status: o.status || 'Confirmed'
        });
      }
    }

    if (placedIso) {
      const existingPlaced = ordersPlacedByDate.get(placedIso);
      const total = o.total || 0;
      const numStr = String(o.orderNumber || o.id || '');
      if (existingPlaced) {
        existingPlaced.total += total;
        existingPlaced.count += 1;
        existingPlaced.orderNumbers.push(numStr);
      } else {
        ordersPlacedByDate.set(placedIso, {
          total,
          count: 1,
          orderNumbers: [numStr]
        });
      }
    }
  });

  // Map wallet transactions (direct purchases / deductions without pre-order)
  const txsByDate = new Map<string, { total: number; details: string }>();
  transactions.forEach((tx) => {
    if (tx.type === 'debit') {
      const iso = normalizeToIso(tx.date);
      if (iso) {
        const existing = txsByDate.get(iso);
        const amount = tx.amount || 0;
        if (existing) {
          existing.total += amount;
        } else {
          txsByDate.set(iso, {
            total: amount,
            details: tx.details || 'Canteen Machine Terminal 02'
          });
        }
      }
    }
  });

  const days: CycleCalendarDay[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const dayNum = current.getDate();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayMap.has(iso);
    const holidayName = holidayMap.get(iso);
    const isWorkingDay = !isWeekend && !isHoliday;
    const isToday = iso === todayStr;
    const isPassed = iso < todayStr;
    const isUpcoming = iso > todayStr;
    const isLeave = leaveDates.includes(iso);
    const order = ordersByDate.get(iso);
    const tx = txsByDate.get(iso);
    const placed = ordersPlacedByDate.get(iso);

    let status: CycleDayStatus;
    let statusLabel: string;

    if (isLeave && isWorkingDay) {
      status = 'leave';
      statusLabel = 'Leave Day (Subsidized deducted)';
    } else if (isWeekend) {
      status = 'weekend';
      statusLabel = 'Weekend (Non-working day)';
    } else if (isHoliday) {
      status = 'holiday';
      statusLabel = `Public Holiday: ${holidayName}`;
    } else if (isPassed) {
      if (order) {
        status = 'passed_claimed';
        let label = `Claimed: Pre-order #${order.orderNumber} ($${order.total.toFixed(2)})`;
        if (placed && placed.total > 0 && !placed.orderNumbers.includes(order.orderNumber)) {
          label += ` • Also placed ${placed.count} pre-orders ($${placed.total.toFixed(2)})`;
        }
        statusLabel = label;
      } else if (tx) {
        status = 'walkin_purchase';
        let label = `Direct Purchase: -$${tx.total.toFixed(2)} (${tx.details || 'Wallet Deduction'})`;
        if (placed) {
          label += ` • Placed ${placed.count} pre-orders ($${placed.total.toFixed(2)})`;
        }
        statusLabel = label;
      } else if (placed) {
        status = 'walkin_purchase';
        statusLabel = `Pre-order Purchase: Placed ${placed.count} meals ($${placed.total.toFixed(2)})`;
      } else {
        status = 'passed_no_order';
        statusLabel = 'Passed: No order or purchase';
      }
    } else if (isToday) {
      if (order) {
        status = 'today_ordered';
        statusLabel = `Today: Pre-order #${order.orderNumber} ($${order.total.toFixed(2)})`;
      } else if (tx) {
        status = 'walkin_purchase';
        statusLabel = `Today: Direct Purchase -$${tx.total.toFixed(2)}`;
      } else if (placed) {
        status = 'walkin_purchase';
        statusLabel = `Today: Placed ${placed.count} pre-orders ($${placed.total.toFixed(2)})`;
      } else {
        status = 'today_not_ordered';
        statusLabel = 'Today: No order placed yet';
      }
    } else {
      // isUpcoming
      if (order) {
        status = 'upcoming_ordered';
        statusLabel = `Pre-ordered: Order #${order.orderNumber} ($${order.total.toFixed(2)})`;
      } else {
        status = 'upcoming_not_ordered';
        statusLabel = 'Upcoming: Not ordered yet';
      }
    }

    days.push({
      date: iso,
      dayNum,
      dayOfWeek,
      isWeekend,
      isHoliday,
      holidayName,
      isToday,
      isPassed,
      isUpcoming,
      isWorkingDay,
      status,
      statusLabel,
      orderTotal: order?.total ?? placed?.total,
      orderNumber: order?.orderNumber ?? (placed ? placed.orderNumbers.join(', ') : undefined),
      itemsSummary: order?.itemsSummary ?? (placed ? `${placed.count} Pre-orders placed` : undefined),
      walletTxTotal: tx?.total ?? placed?.total,
      walletTxDetails: [
        tx?.details,
        placed && (!order || !placed.orderNumbers.includes(order.orderNumber)) ? `Placed ${placed.count} pre-orders ($${placed.total.toFixed(2)})` : null
      ].filter(Boolean).join(' • ') || tx?.details
    });

    current.setDate(current.getDate() + 1);
  }

  // Calculate leading blank days for Monday-start calendar
  const startDayOfWeek = start.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const leadBlankDays = (startDayOfWeek + 6) % 7;

  return { days, leadBlankDays };
}
