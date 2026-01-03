/**
 * Date and time formatting utilities
 * Consolidates duplicated formatting logic from Dashboard and TaskList
 */

import { DURATIONS } from '../constants/config';

/**
 * Converts 24-hour time to 12-hour format with AM/PM
 * @param {string} time24 - Time in HH:MM format
 * @returns {string} - Time in 12-hour format (e.g., "2:30 PM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Calculate hours remaining until a specific date and time
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:MM format
 * @returns {number|null} - Hours remaining (rounded) or null if invalid
 */
export const getTimeRemaining = (dateString, timeString) => {
  if (!dateString || !timeString) return null;
  const taskDateTime = new Date(`${dateString}T${timeString}`);
  const now = new Date();
  const diffMs = taskDateTime - now;
  const diffHours = Math.round(diffMs / (DURATIONS.MS_PER_HOUR));
  return diffHours;
};

/**
 * Format a date and optional time for display with relative labels
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Optional time in HH:MM format
 * @param {boolean} taskIsOverdue - Whether the task is overdue
 * @returns {string} - Formatted date/time string (e.g., "Today » in 3 hours", "Tomorrow » 2:30 PM")
 */
export const formatDateTimeDisplay = (dateString, timeString, taskIsOverdue) => {
  if (!dateString) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const taskDate = new Date(dateString + 'T12:00:00');
  taskDate.setHours(0, 0, 0, 0);

  const diffTime = taskDate - now;
  const diffDays = Math.ceil(diffTime / DURATIONS.MS_PER_DAY);

  const showYear = taskDate.getFullYear() !== now.getFullYear();

  let dateDisplay;
  if (diffDays === 0) {
    dateDisplay = 'Today';
  } else if (diffDays === 1) {
    dateDisplay = 'Tomorrow';
  } else if (diffDays < 0) {
    dateDisplay = new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: showYear ? 'numeric' : undefined
    });
  } else {
    dateDisplay = new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: showYear ? 'numeric' : undefined
    });
  }

  if (timeString) {
    const time12 = formatTime12Hour(timeString);

    if (diffDays === 0 && !taskIsOverdue) {
      const hoursRemaining = getTimeRemaining(dateString, timeString);
      if (hoursRemaining !== null && hoursRemaining > 0) {
        return `${dateDisplay} » in ${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'}`;
      }
    }

    return `${dateDisplay} » ${time12}`;
  }

  return dateDisplay;
};

/**
 * Format date as short month and day (e.g., "Jan 15")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
