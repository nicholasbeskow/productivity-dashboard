import { getToday, isDateBefore } from './dateHelpers';

/**
 * Task-related utility functions
 */

/**
 * Checks if a task is overdue based on its due date and optional time
 * @param {Object} task - The task to check
 * @returns {boolean} - True if task is overdue, false otherwise
 */
export const isTaskOverdue = (task) => {
  if (!task.dueDate || task.status === 'complete') return false;

  try {
    if (task.time) {
      // Task has a specific time - check date + time
      const taskDateTime = new Date(`${task.dueDate}T${task.time}`);
      if (isNaN(taskDateTime.getTime())) return false;
      const now = new Date();
      return taskDateTime < now;
    } else {
      // No time - check date only
      // If dueDate is strictly before today, it's overdue
      const today = getToday();
      return isDateBefore(task.dueDate, today);
    }
  } catch (error) {
    console.error('[taskHelpers] Error checking overdue status:', error, task);
    return false;
  }
};
