import { getLocalISOString, parseLocalDateAtNoon, isDateAfter } from './dateHelpers';
import { calculateNextDueDate } from './recurrenceHelpers';
import backupManager from './backupManager';
import { isTaskOverdue } from './taskHelpers';

/**
 * Creates the next instance of a recurring task
 * @param {Object} task - The completed task object
 * @param {Array} currentTasks - Current list of tasks (for insertion)
 * @returns {Object} { nextTask, insertIndex }
 */
export const createNextRecurrence = (task, currentTasks) => {
  if (!task.templateId) return { nextTask: null, insertIndex: -1 };

  const templates = safeParseLocalStorage('recurringTasks', []);
  const template = templates.find(t => t.id === task.templateId);

  if (!template) {
    console.warn(`[RecurringTaskService] Orphaned task detected: templateId "${task.templateId}" not found. Task will not generate next occurrence.`);
    return { nextTask: null, insertIndex: -1 };
  }

  // Calculate the next due date based on recurrenceAnchor (or dueDate fallback)
  const nextDueDate = calculateNextDueDate(task, template);

  // Create the new task instance for the next occurrence
  const nextOccurrence = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: template.title,
    description: template.description || '',
    url: template.url || null,
    dueDate: nextDueDate,
    recurrenceAnchor: nextDueDate, // Set anchor for consistent future scheduling
    time: template.time || null,
    status: 'not-started',
    taskType: template.taskType || 'academic',
    createdAt: new Date().toISOString(),
    completedAt: null,
    attachments: template.attachments || [],
    templateId: template.id,
    customPriority: 0,
  };

  // Find the right position for the new task based on due date
  let insertIndex = currentTasks.length;

  for (let i = 0; i < currentTasks.length; i++) {
    const t = currentTasks[i];
    if (isTaskOverdue(t)) continue;
    // Lexicographical comparison works for YYYY-MM-DD
    if (!t.dueDate || isDateAfter(t.dueDate, nextDueDate)) {
      insertIndex = i;
      break;
    }
  }

  return { nextTask: nextOccurrence, insertIndex };
};

/**
 * Safely parse JSON from localStorage with error handling
 * @param {string} key - localStorage key
 * @param {any} defaultValue - default value if parsing fails
 * @returns {any} parsed value or default
 */
const safeParseLocalStorage = (key, defaultValue = []) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);

    // Validate that it's an array if we expect an array
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.warn(`[RecurringTaskService] Expected array for ${key}, got ${typeof parsed}. Using default.`);
      return defaultValue;
    }

    return parsed;
  } catch (error) {
    console.error(`[RecurringTaskService] Failed to parse localStorage key "${key}":`, error);
    console.warn(`[RecurringTaskService] Corrupted data detected. Using default value.`);
    return defaultValue;
  }
};

/**
 * Safely save JSON to localStorage with error handling
 * @param {string} key - localStorage key
 * @param {any} value - value to save
 * @returns {boolean} success status
 */
const safeSaveLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[RecurringTaskService] Failed to save to localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Generate recurring task instances based on templates
 * Runs on-demand, no midnight scheduling needed
 * @returns {number} Number of new tasks generated
 */
export const generateRecurringTasks = () => {
  // Helper to calculate Smart Priority based on date
  const calculateSmartPriority = (visualTasks, newTaskDateStr) => {
    const newDueDate = parseLocalDateAtNoon(newTaskDateStr);
    let targetPrev = null;
    let targetNext = null;

    for (let i = 0; i < visualTasks.length; i++) {
      const t = visualTasks[i];
      if (isTaskOverdue(t)) continue;
      if (!t.dueDate) continue;

      const tDate = parseLocalDateAtNoon(t.dueDate);

      // Since visualTasks is sorted High Priority -> Low Priority
      // We expect Earlier Dates (High Prio) -> Later Dates (Low Prio)
      if (tDate < newDueDate) {
        targetPrev = t;
      } else {
        targetNext = t;
        break;
      }
    }

    if (targetPrev && targetNext) {
      return ((targetPrev.customPriority ?? 0) + (targetNext.customPriority ?? 0)) / 2;
    } else if (targetPrev) {
      return (targetPrev.customPriority ?? 0) - 1;
    } else if (targetNext) {
      return (targetNext.customPriority ?? 0) + 1;
    } else {
      // No valid neighbors found in non-overdue section
      const firstNonOverdue = visualTasks.find(t => !isTaskOverdue(t));
      if (firstNonOverdue) return (firstNonOverdue.customPriority ?? 0) + 1;

      // Fallback relative to overdue or default
      const lastOverdue = visualTasks[visualTasks.length - 1]; // visualTasks might include overdue at top?
      // Is lastOverdue actually overdue?
      // visualTasks sort: Overdue first? No, we need to sort it here.
      const actualLastOverdue = visualTasks.findLast(t => isTaskOverdue(t));
      return actualLastOverdue ? (actualLastOverdue.customPriority ?? 0) - 1 : 100;
    }
  };

  try {
    const todayString = getLocalISOString();

    // Get all recurring task templates with error handling
    const templates = safeParseLocalStorage('recurringTasks', []);

    if (templates.length === 0) {
      return 0;
    }

    // Get existing tasks and completed tasks with error handling
    const tasks = safeParseLocalStorage('tasks', []);
    const completedTasks = safeParseLocalStorage('completedTasks', []);

    // Combine all existing tasks to check for duplicates
    const allExistingTasks = [...tasks, ...completedTasks];

    // Maintain a "Visual Sort" of tasks to calculate priorities against
    // Sort by Priority DESC
    let sortedTasks = [...tasks].sort((a, b) => {
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const pA = a.customPriority ?? 0;
      const pB = b.customPriority ?? 0;
      return pB - pA;
    });

    let newTasksGenerated = 0;

    // Process each template
    templates.forEach(template => {
      // Validate template structure
      if (!template || !template.id || !template.title) {
        console.warn('[RecurringTaskService] Skipping invalid template:', template);
        return;
      }

      let shouldGenerate = false;

      // Check if we should generate a task for today based on recurrence rules
      if (template.recurrence && template.recurrence.type === 'daily') {
        shouldGenerate = true;
      } else if (template.recurrence && template.recurrence.type === 'weekly' && template.recurrence.days) {
        // Get today's day (0 = Sunday, 1 = Monday, etc.)
        const today = parseLocalDateAtNoon(todayString);
        const dayOfWeek = today.getDay();

        // Check if today is one of the selected days
        shouldGenerate = template.recurrence.days.includes(dayOfWeek);
      } else if (template.recurrence && template.recurrence.type === 'monthly') {
        // Monthly tasks - generate on the same day of month
        shouldGenerate = true;
      } else if (template.recurrence && template.recurrence.type === 'yearly') {
        // Yearly tasks - generate on the same date each year
        shouldGenerate = true;
      } else if (template.recurrence && template.recurrence.type === 'custom') {
        // Custom intervals - generate every time (let completion handle next due date)
        shouldGenerate = true;
      }

      if (!shouldGenerate) {
        return; // Skip this template
      }

      // Check if a task instance for this template already exists for today
      const instanceExistsForToday = allExistingTasks.some(task => {
        return task.templateId === template.id && task.dueDate === todayString;
      });

      if (instanceExistsForToday) {
        return; // Skip - already generated
      }

      // For weekly tasks: prevent duplicates from early completions
      // Check if any incomplete instance already exists (regardless of date)
      if (template.recurrence && template.recurrence.type === 'weekly') {
        const incompleteInstanceExists = tasks.some(task => {
          return task.templateId === template.id && task.status !== 'complete';
        });

        if (incompleteInstanceExists) {
          return; // Skip - incomplete instance exists
        }
      }

      // Generate a new task instance
      // Calculate Priority FIRST
      const newPriority = calculateSmartPriority(sortedTasks, todayString);

      const newTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: template.title,
        description: template.description || '',
        url: template.url || null,
        dueDate: todayString,
        recurrenceAnchor: todayString,
        time: template.time || null,
        status: 'not-started',
        taskType: template.taskType || 'academic',
        createdAt: new Date().toISOString(),
        completedAt: null,
        attachments: template.attachments || [],
        customPriority: newPriority,
        templateId: template.id,
      };

      // Add to main list
      tasks.push(newTask);

      // Update sorted reference for next iteration (so next task slots correctly relative to this one)
      sortedTasks.push(newTask);
      // Re-sort to maintain integrity for next calculation
      sortedTasks.sort((a, b) => {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        const pA = a.customPriority ?? 0;
        const pB = b.customPriority ?? 0;
        return pB - pA;
      });

      newTasksGenerated++;
    });

    if (newTasksGenerated > 0) {
      // Save updated tasks with error handling
      const saveSuccess = safeSaveLocalStorage('tasks', tasks);

      if (!saveSuccess) {
        console.error('[RecurringTaskService] Failed to save generated tasks to localStorage');
        return 0;
      }

      // Trigger backup
      try {
        backupManager.saveAutoBackup();
      } catch (error) {
        console.error('[RecurringTaskService] Failed to trigger backup:', error);
      }

      // Dispatch storage event to update UI
      try {
        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        console.error('[RecurringTaskService] Failed to dispatch storage event:', error);
      }
    }

    return newTasksGenerated;
  } catch (error) {
    console.error('[RecurringTaskService] Critical error generating tasks:', error);
    console.error('[RecurringTaskService] Stack trace:', error.stack);
    return 0;
  }
};

export default {
  generateRecurringTasks,
  safeParseLocalStorage,
  safeSaveLocalStorage,
};
