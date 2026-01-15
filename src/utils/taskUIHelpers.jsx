/**
 * Task UI Helper Functions
 * Shared utilities for rendering task cards consistently across Dashboard and TaskList
 */

import { Check, Circle, Clock } from 'lucide-react';
import React from 'react';

/**
 * Returns the appropriate icon for task status
 * @param {string} status - 'complete', 'in-progress', or 'not-started'
 * @returns {React.ReactElement} - Icon component
 */
export const getStatusIcon = (status) => {
    switch (status) {
        case 'complete':
            return <Check size={18} className="text-green-glow" />;
        case 'in-progress':
            return <Clock size={18} className="text-yellow-500" />;
        default:
            return <Circle size={18} className="text-white/40" />;
    }
};

/**
 * Returns status text label
 * @param {string} status - 'complete', 'in-progress', or 'not-started'
 * @returns {string} - Status label text
 */
export const getStatusLabel = (status) => {
    switch (status) {
        case 'complete':
            return 'Complete';
        case 'in-progress':
            return 'In Progress';
        default:
            return 'Not Started';
    }
};

/**
 * Returns glow CSS class based on task state
 * @param {Object} task - Task object
 * @param {boolean} isOverdue - Whether task is overdue
 * @returns {string} - CSS class for glow effect
 */
export const getCardGlow = (task, isOverdue) => {
    if (isOverdue) return 'task-glow-overdue';
    switch (task.status) {
        case 'complete': return 'task-glow-complete';
        case 'in-progress': return 'task-glow-in-progress';
        default: return 'task-glow-not-started';
    }
};

/**
 * Returns checkbox CSS class based on task state
 * @param {Object} task - Task object
 * @param {boolean} taskIsOverdue - Whether task is overdue
 * @returns {string} - CSS class for checkbox styling
 */
export const getCheckboxClass = (task, taskIsOverdue) => {
    if (taskIsOverdue) return 'checkbox-overdue';
    if (task.status === 'complete') return 'checkbox-complete';
    if (task.status === 'in-progress') return 'checkbox-in-progress';
    return 'checkbox-not-started';
};
