export interface DaySchedule {
  dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  dateStr: string;
  formattedDate: string;
  shortDate: string;
  fullLabel: string;
  isToday: boolean;
}

export function getCurrentWeekSchedule(): DaySchedule[] {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Calculate difference to Monday
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday'
  ];

  return days.map((dayName, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const formattedDate = d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const shortDate = d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short'
    });

    return {
      dayName,
      dateStr: d.toISOString().split('T')[0],
      formattedDate,
      shortDate,
      fullLabel: `${dayName}, ${formattedDate}`,
      isToday
    };
  });
}
