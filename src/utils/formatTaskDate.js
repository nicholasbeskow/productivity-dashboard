import { format, isToday, isTomorrow, isSameDay, addDays, getDay } from 'date-fns';

/**
 * Generates a "smart" date string for task group headers.
 * Rules:
 * - Today: "Today · [Day of Week]" (e.g., "Nov 2 · Today · Sunday")
 * - Tomorrow: "Tomorrow · [Day of Week]" (e.g., "Nov 3 · Tomorrow · Monday")
 * - Within the next 7 days: "[Day of Week] · [Date]" (e.g., "Wednesday · Nov 5")
 * - All other dates (past or future): "[Short Date] · [Day of Week]" (e.g., "Nov 11 · Tuesday")
 */
export const formatTaskDateHeader = (dateString) => {
  if (!dateString) return 'Inbox'; // Should not happen, but safeguard

  const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  const dateFmt = format(date, 'MMM d'); // e.g., "Nov 2"
  const dayFmt = format(date, 'EEEE');   // e.g., "Sunday"

  if (isSameDay(date, today)) {
    return `${dateFmt} · Today · ${dayFmt}`;
  }
  if (isSameDay(date, tomorrow)) {
    return `${dateFmt} · Tomorrow · ${dayFmt}`;
  }

  // Check if it's within the next 7 days (but not today or tomorrow)
  if (date > tomorrow && date < nextWeek) {
    return `${dayFmt} · ${dateFmt}`;
  }

  // For all other dates (past or further in the future)
  // Use "Tue, Nov 11" format
  return `${format(date, 'EEE, MMM d')}`;
};
