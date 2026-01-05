/**
 * Date utility functions that handle timezone conversions properly.
 *
 * CRITICAL: Always use these helpers instead of new Date().toISOString()
 * to avoid timezone bugs where dates shift by a day.
 */

/**
 * Get the current local date as YYYY-MM-DD string.
 * Uses the system's local clock, NOT UTC.
 *
 * @returns {string} - Local date in YYYY-MM-DD format
 */
export const getLocalISOString = () => {
  const d = new Date();
  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

/**
 * Get today's date as YYYY-MM-DD string in local time.
 *
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getToday = () => {
  return getLocalISOString();
};

/**
 * Get tomorrow's date as YYYY-MM-DD string in local time.
 *
 * @returns {string} - Tomorrow's date in YYYY-MM-DD format
 */
export const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

/**
 * Add days to a date and return YYYY-MM-DD string in local time.
 *
 * @param {Date} date - The date to add to
 * @param {number} days - Number of days to add
 * @returns {string} - Resulting date in YYYY-MM-DD format
 */
export const addDaysToDate = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

/**
 * Convert a Date object to YYYY-MM-DD string in local time.
 *
 * @param {Date} date - The date to convert
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const dateToLocalISO = (date) => {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

/**
 * Parse a local date string (YYYY-MM-DD) into a Date object set to midnight local time.
 * This replaces the "noon hack" (appending T12:00:00) throughout the codebase.
 *
 * IMPORTANT: This creates a Date with midnight local time, NOT UTC midnight.
 * This ensures date comparisons work correctly without timezone shifts.
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date} - Date object set to midnight local time
 *
 * @example
 * // Instead of: new Date(dateString + 'T12:00:00')
 * // Use: parseLocalDate(dateString)
 * const date = parseLocalDate('2025-01-15'); // January 15, 2025 at 00:00:00 local time
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  // Split the date string into components
  const [year, month, day] = dateString.split('-').map(Number);

  // Create Date using local time components (month is 0-indexed)
  // This avoids timezone shifts that occur when parsing ISO strings
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Parse a local date string (YYYY-MM-DD) and set it to noon local time.
 * Use this when you need a mid-day timestamp to avoid timezone edge cases.
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date} - Date object set to noon local time
 */
export const parseLocalDateAtNoon = (dateString) => {
  if (!dateString) return null;

  const [year, month, day] = dateString.split('-').map(Number);

  // Create Date at noon local time
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

/**
 * Compare two date strings (YYYY-MM-DD) for equality.
 * This is safer than creating Date objects and comparing them directly.
 *
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} - True if dates are equal
 */
export const isSameDate = (date1, date2) => {
  return date1 === date2;
};

/**
 * Check if a date string (YYYY-MM-DD) is before another date string.
 *
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} - True if date1 is before date2
 */
export const isDateBefore = (date1, date2) => {
  return date1 < date2;
};

/**
 * Check if a date string (YYYY-MM-DD) is after another date string.
 *
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} - True if date1 is after date2
 */
export const isDateAfter = (date1, date2) => {
  return date1 > date2;
};

/**
 * Convert ISO date (YYYY-MM-DD) to display format (MM-DD-YYYY)
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {string} - Date in MM-DD-YYYY format
 */
export const isoToDisplay = (isoDate) => {
  if (!isoDate || !isoDate.trim()) return '';

  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${month}-${day}-${year}`;
  }

  return isoDate;
};

/**
 * Convert display format (MM-DD-YYYY) to ISO (YYYY-MM-DD)
 * @param {string} displayDate - Date in MM-DD-YYYY format
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const displayToIso = (displayDate) => {
  if (!displayDate || !displayDate.trim()) return '';

  const match = displayDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month}-${day}`;
  }

  return displayDate;
};

/**
 * Helper function to parse smart date input
 * Handles formats: M/D, MM/DD, M-D, MM-DD, MM-DD-YYYY, YYYY-MM-DD
 *
 * @param {string} input - The user input string
 * @returns {Object} - { iso: string, display: string }
 */
export const parseSmartDate = (input) => {
  if (!input || !input.trim()) {
    return { iso: '', display: '' };
  }

  const trimmed = input.trim();

  // Regex patterns for shorthand dates: M/D, MM/DD, M-D, MM-DD
  const shorthandPattern = /^(\d{1,2})[\/\-](\d{1,2})$/;
  const match = trimmed.match(shorthandPattern);

  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();

    // Return both ISO and display formats
    return {
      iso: `${currentYear}-${month}-${day}`,
      display: `${month}-${day}-${currentYear}`
    };
  }

  // Check if it's already in MM-DD-YYYY format
  const displayMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (displayMatch) {
    const month = displayMatch[1].padStart(2, '0');
    const day = displayMatch[2].padStart(2, '0');
    const year = displayMatch[3];

    return {
      iso: `${year}-${month}-${day}`,
      display: `${month}-${day}-${year}`
    };
  }

  // Check if it's in YYYY-MM-DD format (convert to display)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      iso: trimmed,
      display: isoToDisplay(trimmed)
    };
  }

  // Return as-is if format is unrecognized
  return { iso: trimmed, display: trimmed };
};
