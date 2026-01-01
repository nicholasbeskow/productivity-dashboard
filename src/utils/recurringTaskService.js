import { getLocalISOString } from './dateHelpers';
import backupManager from './backupManager';

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
  try {
    console.log('[RecurringTaskService] Running continuous task generator...');

    const todayString = getLocalISOString();

    // Get all recurring task templates with error handling
    const templates = safeParseLocalStorage('recurringTasks', []);

    if (templates.length === 0) {
      console.log('[RecurringTaskService] No recurring templates found.');
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
        const today = new Date(todayString + 'T12:00:00');
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
        console.log(`[RecurringTaskService] Task instance already exists for template "${template.title}" on ${todayString}`);
        return; // Skip - already generated
      }

      // For weekly tasks: prevent duplicates from early completions
      // Check if any incomplete instance already exists (regardless of date)
      if (template.recurrence && template.recurrence.type === 'weekly') {
        const incompleteInstanceExists = tasks.some(task => {
          return task.templateId === template.id && task.status !== 'complete';
        });

        if (incompleteInstanceExists) {
          console.log(`[RecurringTaskService] Incomplete weekly task already exists for template "${template.title}"`);
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
        customPriority: 0,
        templateId: template.id,
      };

      tasks.push(newTask);
      newTasksGenerated++;
      console.log(`[RecurringTaskService] Generated task instance for template "${template.title}"`);
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

      console.log(`[RecurringTaskService] Generated ${newTasksGenerated} new task(s)`);
    } else {
      console.log('[RecurringTaskService] No new tasks generated');
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
