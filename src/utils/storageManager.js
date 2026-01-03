/**
 * LocalStorage utility wrapper
 * Provides type-safe, error-handled access to localStorage
 * Eliminates repeated JSON.parse/stringify patterns throughout the app
 */

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {*} - Parsed value or default
 */
export const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`[StorageManager] Error getting ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Set item in localStorage with JSON stringifying
 * @param {string} key - localStorage key
 * @param {*} value - Value to store
 * @returns {boolean} - Success status
 */
export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[StorageManager] Error setting ${key}:`, error);
    return false;
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - localStorage key
 * @returns {boolean} - Success status
 */
export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[StorageManager] Error removing ${key}:`, error);
    return false;
  }
};

/**
 * Get string value from localStorage (no JSON parsing)
 * @param {string} key - localStorage key
 * @param {string} defaultValue - Default value if key doesn't exist
 * @returns {string} - String value or default
 */
export const getString = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.error(`[StorageManager] Error getting string ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Set string value in localStorage (no JSON stringifying)
 * @param {string} key - localStorage key
 * @param {string} value - String value to store
 * @returns {boolean} - Success status
 */
export const setString = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`[StorageManager] Error setting string ${key}:`, error);
    return false;
  }
};

/**
 * Check if key exists in localStorage
 * @param {string} key - localStorage key
 * @returns {boolean} - True if key exists
 */
export const hasItem = (key) => {
  return localStorage.getItem(key) !== null;
};

/**
 * Clear all localStorage
 * @returns {boolean} - Success status
 */
export const clear = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('[StorageManager] Error clearing localStorage:', error);
    return false;
  }
};
