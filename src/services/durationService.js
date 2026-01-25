/**
 * Duration Service
 * Handles task duration tracking, predictions, and cooldown management
 */

import { STORAGE_KEYS } from '../constants/storageKeys';

// ============= DURATION HISTORY =============

/**
 * Save a task completion duration to history
 * @param {Object} task - The completed task
 * @param {number} durationMinutes - How long it took in minutes
 */
export const saveDuration = (task, durationMinutes) => {
    const history = getDurationHistory();

    const entry = {
        taskId: task.id,
        templateId: task.templateId || null,
        title: task.title,
        course: task.course || null,
        category: task.taskType || 'personal',
        durationMinutes,
        completedAt: new Date().toISOString(),
    };

    history.unshift(entry); // Most recent first

    // Keep last 500 entries to avoid localStorage bloat
    const trimmed = history.slice(0, 500);

    localStorage.setItem(STORAGE_KEYS.TASK_DURATION_HISTORY, JSON.stringify(trimmed));
    return entry;
};

/**
 * Get all duration history
 * @returns {Array} Array of duration entries
 */
export const getDurationHistory = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.TASK_DURATION_HISTORY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

/**
 * Get duration entries for tasks matching a template (recurring tasks)
 * @param {string} templateId - The recurring task template ID
 * @returns {Array} Matching duration entries
 */
export const getHistoryForTemplate = (templateId) => {
    if (!templateId) return [];
    return getDurationHistory().filter(entry => entry.templateId === templateId);
};

/**
 * Clear all duration history
 */
export const clearDurationHistory = () => {
    localStorage.removeItem(STORAGE_KEYS.TASK_DURATION_HISTORY);
};

// ============= COOLDOWN MANAGEMENT =============

/**
 * Check if duration prompts are currently in cooldown
 * @returns {boolean}
 */
export const isCooldownActive = () => {
    const until = localStorage.getItem(STORAGE_KEYS.DURATION_COOLDOWN_UNTIL);
    if (!until) return false;

    return new Date(until) > new Date();
};

/**
 * Set cooldown for a specified number of minutes
 * @param {number} minutes - Cooldown duration
 */
export const setCooldown = (minutes) => {
    const until = new Date(Date.now() + minutes * 60 * 1000);
    localStorage.setItem(STORAGE_KEYS.DURATION_COOLDOWN_UNTIL, until.toISOString());
};

/**
 * Get remaining cooldown time in milliseconds
 * @returns {number} Remaining ms, or 0 if not in cooldown
 */
export const getRemainingCooldown = () => {
    const until = localStorage.getItem(STORAGE_KEYS.DURATION_COOLDOWN_UNTIL);
    if (!until) return 0;

    const remaining = new Date(until) - new Date();
    return Math.max(0, remaining);
};

/**
 * Clear active cooldown
 */
export const clearCooldown = () => {
    localStorage.removeItem(STORAGE_KEYS.DURATION_COOLDOWN_UNTIL);
};

/**
 * Format remaining cooldown as human-readable string
 * @returns {string} e.g., "2h 15m remaining" or ""
 */
export const formatRemainingCooldown = () => {
    const remaining = getRemainingCooldown();
    if (remaining <= 0) return '';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.ceil((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
};

// ============= FEATURE TOGGLE =============

/**
 * Check if duration prediction feature is enabled
 * @returns {boolean} Default true if not set
 */
export const isFeatureEnabled = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.DURATION_FEATURE_ENABLED);
    // Default to true if not explicitly set
    return stored === null ? true : stored === 'true';
};

/**
 * Enable or disable the duration prediction feature
 * @param {boolean} enabled
 */
export const setFeatureEnabled = (enabled) => {
    localStorage.setItem(STORAGE_KEYS.DURATION_FEATURE_ENABLED, String(enabled));
};

// ============= PREDICTION HELPERS =============

/**
 * Calculate predicted duration using median-based algorithm with recency boost
 * @param {Array} durations - Array of duration entries (most recent first)
 * @returns {Object|null} { predictedMinutes, confidencePercent } or null if no data
 */
export const calculatePrediction = (durations) => {
    if (!durations || durations.length === 0) return null;

    // Extract just the minutes
    const minutes = durations.map(d => d.durationMinutes);

    // Sort for median calculation
    const sorted = [...minutes].sort((a, b) => a - b);

    // Calculate median (robust to outliers)
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    // Apply recency boost (recent entries weighted ~25% more)
    // Weight = 1.0 for oldest, up to 1.25 for newest
    let weightedSum = 0;
    let totalWeight = 0;

    minutes.forEach((min, index) => {
        // index 0 is most recent
        const recencyWeight = 1 + (0.25 * (1 - index / Math.max(minutes.length - 1, 1)));
        weightedSum += min * recencyWeight;
        totalWeight += recencyWeight;
    });

    const weightedAvg = weightedSum / totalWeight;

    // Blend: 70% median (outlier resistant) + 30% weighted average (recency aware)
    const blended = median * 0.7 + weightedAvg * 0.3;

    // Round to nearest 5 minutes for cleaner display
    const predictedMinutes = Math.round(blended / 5) * 5 || Math.round(blended);

    // Confidence based on sample size
    // 1 sample = 30%, 3 samples = 55%, 5+ samples = 75%+, 10+ = 90%+
    const baseConfidence = Math.min(90, 30 + (durations.length * 10));

    // Reduce confidence if data is very spread out (high variance)
    const variance = minutes.reduce((sum, m) => sum + Math.pow(m - median, 2), 0) / minutes.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = stdDev / median;

    // High CoV (>0.5) reduces confidence
    const variancePenalty = Math.min(25, coeffOfVariation * 30);
    const confidencePercent = Math.round(Math.max(20, baseConfidence - variancePenalty));

    return {
        predictedMinutes,
        confidencePercent,
        sampleCount: durations.length,
    };
};

export default {
    saveDuration,
    getDurationHistory,
    getHistoryForTemplate,
    clearDurationHistory,
    isCooldownActive,
    setCooldown,
    getRemainingCooldown,
    clearCooldown,
    formatRemainingCooldown,
    isFeatureEnabled,
    setFeatureEnabled,
    calculatePrediction,
};
