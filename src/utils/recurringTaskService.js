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
  // Helper to insert task in date-sorted position
  const insertTaskSorted = (taskArray, newTask) => {
    let insertIdx = taskArray.length;

    // Parse new task date (default to far future if none)
    const newTaskDate = newTask.dueDate ? parseLocalDateAtNoon(newTask.dueDate) : new Date(8640000000000000);

    for (let i = 0; i < taskArray.length; i++) {
      const t = taskArray[i];
      if (isTaskOverdue(t)) continue; // Skip overdue tasks (they stay at top)

      const tDate = t.dueDate ? parseLocalDateAtNoon(t.dueDate) : new Date(8640000000000000);

      // If current task is later than new task, insert here
      if (tDate > newTaskDate) {
        insertIdx = i;
        break;
      }
    }

    taskArray.splice(insertIdx, 0, newTask);
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
        // Priority will be recalculated after insertion
        customPriority: 0,
        templateId: template.id,
      };

      // Insert at correct position based on Date (Sorted Insert)
      insertTaskSorted(tasks, newTask);
      newTasksGenerated++;
    });

    if (newTasksGenerated > 0) {
      // Recalculate priorities for ALL tasks to maintain order
      // This ensures the new tasks get a priority relative to their position
      const updatedTasks = tasks.map((t, index) => ({
        ...t,
        customPriority: tasks.length - index,
      }));

      // Save updated tasks with error handling
      const saveSuccess = safeSaveLocalStorage('tasks', updatedTasks);

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
