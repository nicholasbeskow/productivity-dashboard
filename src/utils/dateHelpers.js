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
