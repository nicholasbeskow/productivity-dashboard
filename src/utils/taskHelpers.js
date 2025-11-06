import { addDays, getDay, parseISO, format } from 'date-fns';

/**
 * Calculates the next due date for a recurring task.
 */
export const calculateNextDueDate = (task) => {
  if (!task.recurrence) return null;

  const { type } = task.recurrence;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use the task's due date as the base, or today if it's missing or in the past
  let baseDate = task.dueDate ? parseISO(task.dueDate) : today;
  if (baseDate < today) {
    baseDate = today;
  }

  let nextDate;

  if (type === 'daily') {
    nextDate = addDays(baseDate, 1);
  } else if (type === 'weekly') {
    const sortedDays = [...task.recurrence.days].sort((a, b) => a - b);
    if (sortedDays.length === 0) return null; // No days selected

    const currentDay = getDay(baseDate); // 0 = Sunday, 1 = Monday...

    // Find the next available day in the week, *after* the current day
    const nextDayInWeek = sortedDays.find(day => day > currentDay);

    if (nextDayInWeek !== undefined) {
      // Found a day later this week
      nextDate = addDays(baseDate, nextDayInWeek - currentDay);
    } else {
      // No days left this week, go to the first selected day of *next* week
      const firstDayNextWeek = sortedDays[0];
      const daysUntilNextWeek = (7 - currentDay) + firstDayNextWeek;
      nextDate = addDays(baseDate, daysUntilNextWeek);
    }
  }

  if (!nextDate) return null;

  return format(nextDate, 'yyyy-MM-dd');
};
