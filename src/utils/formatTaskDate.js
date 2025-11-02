import { format, isToday, isTomorrow, isSameDay, addDays } from 'date-fns';

/**
 * Generates a "smart" date string for task group headers.
 * Rules:
 * - Today: "Today"
 * - Tomorrow: "Tomorrow"
 * - Within the next 7 days: "[Day of Week]" (e.g., "Friday")
 * - All other dates (past or future): "[Day of Week], [Date]" (e.g., "Tue, Nov 11")
 */
export const formatTaskDateHeader = (dateString) => {
  if (!dateString) return 'Inbox'; // This key is set manually

  const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
  const today = new Date();
  const tomorrow = addDays(today, 1);

  // Set today to noon for accurate comparison
  today.setHours(12, 0, 0, 0);

  if (isSameDay(date, today)) {
    return 'Today';
  }
  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  }

  // Check if it's within the next 7 days (but not today or tomorrow)
  const nextWeek = addDays(today, 7);
  if (date > tomorrow && date < nextWeek) {
    return format(date, 'EEEE'); // e.g., "Friday"
  }

  // For all other dates (past or further in the future)
  return format(date, 'EEE, MMM d'); // e.g., "Tue, Nov 11"
};
