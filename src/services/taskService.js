import backupManager from '../utils/backupManager';
import { isTaskOverdue } from '../utils/taskHelpers';
import { parseLocalDateAtNoon } from '../utils/dateHelpers';
import { createNextRecurrence } from '../utils/recurringTaskService';

/**
 * Centralized Task Service
 * All task CRUD operations in one place
 */

// ============= PERSISTENCE =============

/**
 * Load tasks from localStorage with validation
 */
export const loadTasks = () => {
    try {
        const storedTasks = localStorage.getItem('tasks');
        if (!storedTasks) return [];

        const parsedTasks = JSON.parse(storedTasks);
        if (!Array.isArray(parsedTasks)) {
            console.error('[taskService] Invalid tasks data: expected array');
            return [];
        }

        // Filter out invalid tasks
        const validTasks = parsedTasks.filter(task => {
            if (!task.id || !task.title) return false;
            if (task.dueDate) {
                const testDate = parseLocalDateAtNoon(task.dueDate);
                if (isNaN(testDate.getTime())) return false;
            }
            return true;
        });

        // Ensure all tasks have customPriority
        return validTasks.map((task, index) => ({
            ...task,
            customPriority: task.customPriority ?? (validTasks.length - index),
        }));
    } catch (error) {
        console.error('[taskService] Error loading tasks:', error);
        return [];
    }
};

/**
 * Save tasks to localStorage and trigger sync
 */
export const saveTasks = (tasks) => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    backupManager.saveAutoBackup();
    window.dispatchEvent(new Event('storage'));
};

// ============= TASK OPERATIONS =============

/**
 * Create a new task with correct priority based on neighbors
 */
export const createTask = (tasks, newTask) => {
    // 1. Sort current tasks by Priority (DESC) to match visual order in UI
    const sortedTasks = [...tasks].sort((a, b) => {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        const pA = a.customPriority ?? 0;
        const pB = b.customPriority ?? 0;
        return pB - pA;
    });

    let newPriority;

    if (isTaskOverdue(newTask)) {
        // Overdue tasks go to the top
        const firstOverdue = sortedTasks.find(t => isTaskOverdue(t));
        const topPrio = firstOverdue ? (firstOverdue.customPriority ?? 0) : (sortedTasks[0]?.customPriority ?? 0);
        newPriority = topPrio + 1;
    } else if (!newTask.dueDate) {
        // No due date - put at top of non-overdue section (Personal preference: High visibility)
        const firstNonOverdue = sortedTasks.find(t => !isTaskOverdue(t));
        if (firstNonOverdue) {
            newPriority = (firstNonOverdue.customPriority ?? 0) + 1;
        } else {
            // No non-overdue tasks exists (or list empty)
            const lastOverdue = sortedTasks[sortedTasks.length - 1]; // Last task in list
            newPriority = lastOverdue ? (lastOverdue.customPriority ?? 0) - 1 : 100;
        }
    } else {
        // Standard Date-Based Insertion
        const newDueDate = parseLocalDateAtNoon(newTask.dueDate);

        let targetPrev = null; // Task that should be visually ABOVE (Higher Priority)
        let targetNext = null; // Task that should be visually BELOW (Lower Priority)

        // Iterate through sorted tasks to find the chronological "slot"
        // We look for the transition where tasks go from "Earlier" to "Later/Same"
        // Since we iterate Priority High -> Low (Top -> Bottom):
        // We expect to see Earliest Dates first (Top of List), then Later Dates (Bottom of List)

        for (let i = 0; i < sortedTasks.length; i++) {
            const t = sortedTasks[i];
            if (isTaskOverdue(t)) continue; // Skip overdue
            if (!t.dueDate) continue; // Skip no-date tasks (assume they are effectively "Later")

            const tDate = parseLocalDateAtNoon(t.dueDate);

            if (tDate < newDueDate) {
                // Task is Earlier. It stays Above.
                targetPrev = t;
            } else {
                // Task is Same or Later. We want to insert HERE (Before this task).
                // This places us:
                // 1. Above "Later" tasks (Good)
                // 2. Above "Same Date" tasks (Top of the day group - Good default)
                targetNext = t;
                break;
            }
        }

        // Calculate Priority
        if (targetPrev && targetNext) {
            newPriority = ((targetPrev.customPriority ?? 0) + (targetNext.customPriority ?? 0)) / 2;
        } else if (targetPrev) {
            // Only tasks before us. We are at the bottom of the known dated list.
            newPriority = (targetPrev.customPriority ?? 0) - 1;
        } else if (targetNext) {
            // Only tasks after us (or same day). We are at the top of the non-overdue dated list.
            newPriority = (targetNext.customPriority ?? 0) + 1;
        } else {
            // No formatted neighbors. Fallback relative to Overdue/List.
            const firstNonOverdue = sortedTasks.find(t => !isTaskOverdue(t));
            if (firstNonOverdue) {
                // Should ideally not happen if loop ran, but if all non-overdues had no dates?
                newPriority = (firstNonOverdue.customPriority ?? 0) + 1;
            } else {
                const lastOverdue = sortedTasks.findLast(t => isTaskOverdue(t));
                newPriority = lastOverdue ? (lastOverdue.customPriority ?? 0) - 1 : 100;
            }
        }
    }

    const taskWithPriority = { ...newTask, customPriority: newPriority };
    return [taskWithPriority, ...tasks];
};

/**
 * Update a single task
 */
export const updateTask = (tasks, taskId, updates) => {
    return tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
};

/**
 * Change task status: not-started → in-progress → complete → not-started
 * Returns { updatedTasks, completedTask } if task was completed
 */
export const changeStatus = (tasks, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { updatedTasks: tasks, completedTask: null, newStatus: null };

    let newStatus;
    let completedAt = task.completedAt;

    if (task.status === 'not-started') {
        newStatus = 'in-progress';
    } else if (task.status === 'in-progress') {
        newStatus = 'complete';
        completedAt = new Date().toISOString();
    } else {
        newStatus = 'not-started';
        completedAt = null;
    }

    const updatedTasks = tasks.map(t => {
        if (t.id === taskId) {
            return { ...t, status: newStatus, completedAt };
        }
        return t;
    });

    const completedTask = newStatus === 'complete' ? { ...task, status: 'complete', completedAt } : null;

    return { updatedTasks, completedTask, newStatus };
};

/**
 * Handle task completion: remove from active, add to completed, create recurrence
 */
export const completeTask = (tasks, taskId, completedTask) => {
    // Add to completedTasks
    const existingCompleted = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    localStorage.setItem('completedTasks', JSON.stringify([completedTask, ...existingCompleted]));

    // Remove from active tasks
    let activeTasks = tasks.filter(t => t.id !== taskId);

    // Handle recurring task
    if (completedTask.templateId) {
        const { nextTask } = createNextRecurrence(completedTask, activeTasks);

        if (nextTask) {
            // Use smart insertion logic
            activeTasks = createTask(activeTasks, nextTask);
        }
    }

    return activeTasks;
};

/**
 * Delete a task (handles both normal and recurring)
 */
export const deleteTask = (tasks, taskId, scope = 'instance') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return tasks;

    if (task.templateId && scope === 'series') {
        // Delete entire series
        const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
        const updatedTemplates = templates.filter(t => t.id !== task.templateId);
        localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));

        return tasks.filter(t => t.templateId !== task.templateId);
    }

    // Delete single instance
    let updatedTasks = tasks.filter(t => t.id !== taskId);

    // Create next recurrence if this was a recurring task instance
    if (task.templateId) {
        const { nextTask } = createNextRecurrence(task, updatedTasks);
        if (nextTask) {
            // Use smart insertion logic
            updatedTasks = createTask(updatedTasks, nextTask);
        }
    }

    return updatedTasks;
};

/**
 * Move task to top of the list
 */
export const moveToTop = (tasks, taskId) => {
    let maxPriority = -1;
    tasks.forEach(t => {
        if (t.customPriority && typeof t.customPriority === 'number') {
            if (t.customPriority > maxPriority) maxPriority = t.customPriority;
        }
    });

    return tasks.map(t => {
        if (t.id === taskId) {
            return { ...t, customPriority: maxPriority + 1 };
        }
        return t;
    });
};

/**
 * Restore task to its natural chronological position
 */
export const restoreLocation = (tasks, taskId, compareTasks) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return tasks;

    const naturalSorted = [...tasks].sort(compareTasks);
    const naturalIndex = naturalSorted.findIndex(t => t.id === taskId);
    if (naturalIndex === -1) return tasks;

    const prevTask = naturalIndex > 0 ? naturalSorted[naturalIndex - 1] : null;
    const nextTask = naturalIndex < naturalSorted.length - 1 ? naturalSorted[naturalIndex + 1] : null;

    let newPriority;
    if (prevTask && nextTask) {
        const prevPrio = prevTask.customPriority ?? 0;
        const nextPrio = nextTask.customPriority ?? 0;
        if (prevPrio === 0 && nextPrio === 0) {
            newPriority = undefined;
        } else {
            newPriority = (prevPrio + nextPrio) / 2;
        }
    } else if (prevTask) {
        const prevPrio = prevTask.customPriority ?? 0;
        newPriority = prevPrio === 0 ? undefined : prevPrio - 1;
    } else if (nextTask) {
        const nextPrio = nextTask.customPriority ?? 0;
        newPriority = nextPrio === 0 ? undefined : nextPrio + 1;
    } else {
        newPriority = undefined;
    }

    return tasks.map(t => {
        if (t.id === taskId) {
            if (newPriority === undefined) {
                const { customPriority, ...rest } = t;
                return rest;
            }
            return { ...t, customPriority: newPriority };
        }
        return t;
    });
};

/**
 * Duplicate a task
 */
export const duplicateTask = (tasks, taskId) => {
    const taskToDuplicate = tasks.find(t => t.id === taskId);
    if (!taskToDuplicate) return tasks;

    const duplicatedTask = {
        ...taskToDuplicate,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'not-started',
        completedAt: null,
        createdAt: new Date().toISOString(),
        title: `${taskToDuplicate.title} (Copy)`,
        customPriority: taskToDuplicate.customPriority ? taskToDuplicate.customPriority + 0.5 : 0.5,
        templateId: undefined, // Don't link to recurring template
    };

    const newTasks = [...tasks];
    const originalIndex = newTasks.findIndex(t => t.id === taskId);
    if (originalIndex !== -1) {
        newTasks.splice(originalIndex + 1, 0, duplicatedTask);
    } else {
        newTasks.push(duplicatedTask);
    }

    return newTasks;
};

/**
 * Smart reset: recalculate all priorities based on chronological order
 */
export const smartReset = (tasks) => {
    const sortedTasks = [...tasks].sort((a, b) => {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        if (a.dueDate && b.dueDate) {
            if (a.dueDate !== b.dueDate) {
                return parseLocalDateAtNoon(a.dueDate) - parseLocalDateAtNoon(b.dueDate);
            }
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            if (a.time && b.time) return a.time.localeCompare(b.time);
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return sortedTasks.map((task, index) => ({
        ...task,
        customPriority: sortedTasks.length - index
    }));
};

/**
 * Reorder task via drag and drop
 */
export const reorderTask = (tasks, visibleTasks, draggedTaskId, dropTaskId) => {
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const dropTask = tasks.find(t => t.id === dropTaskId);

    if (!draggedTask || !dropTask || draggedTaskId === dropTaskId) return tasks;

    const visibleDragIndex = visibleTasks.findIndex(t => t.id === draggedTaskId);
    const visibleDropIndex = visibleTasks.findIndex(t => t.id === dropTaskId);

    if (visibleDragIndex === -1 || visibleDropIndex === -1) return tasks;

    let newPriority;
    const dropTaskPriority = dropTask.customPriority ?? 0;
    const dropTaskOverdue = isTaskOverdue(dropTask);

    if (visibleDragIndex < visibleDropIndex) {
        // Dragging DOWN
        const taskAfterDrop = visibleTasks[visibleDropIndex + 1];
        const afterPriority = taskAfterDrop?.customPriority ?? (dropTaskPriority - 1);
        newPriority = (dropTaskPriority + afterPriority) / 2;
    } else {
        // Dragging UP
        const taskBeforeDrop = visibleTasks[visibleDropIndex - 1];
        const crossingBoundary = taskBeforeDrop && isTaskOverdue(taskBeforeDrop) && !dropTaskOverdue;

        let beforePriority;
        if (!taskBeforeDrop || crossingBoundary) {
            beforePriority = dropTaskPriority + 1;
        } else {
            beforePriority = taskBeforeDrop.customPriority ?? (dropTaskPriority + 1);
        }

        newPriority = (beforePriority + dropTaskPriority) / 2;
    }

    return tasks.map(t => {
        if (t.id === draggedTaskId) {
            return { ...t, customPriority: newPriority };
        }
        return t;
    });
};

export default {
    loadTasks,
    saveTasks,
    createTask,
    updateTask,
    changeStatus,
    completeTask,
    deleteTask,
    moveToTop,
    restoreLocation,
    duplicateTask,
    smartReset,
    reorderTask,
};
