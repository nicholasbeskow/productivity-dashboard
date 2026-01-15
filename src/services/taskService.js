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
    let insertIndex = tasks.length;

    // Find insertion point based on due date
    if (newTask.dueDate) {
        const newDueDate = parseLocalDateAtNoon(newTask.dueDate);

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (isTaskOverdue(task)) continue;
            if (!task.dueDate || parseLocalDateAtNoon(task.dueDate) > newDueDate) {
                insertIndex = i;
                break;
            }
        }
    }

    // Calculate priority based on neighbors (NOT recalculating all)
    const taskBefore = tasks[insertIndex - 1];
    const taskAfter = tasks[insertIndex];

    let newPriority;
    if (taskBefore && taskAfter) {
        newPriority = ((taskBefore.customPriority ?? 0) + (taskAfter.customPriority ?? 0)) / 2;
    } else if (taskBefore) {
        newPriority = (taskBefore.customPriority ?? 0) - 1;
    } else if (taskAfter) {
        newPriority = (taskAfter.customPriority ?? 0) + 1;
    } else {
        newPriority = 1;
    }

    const taskWithPriority = { ...newTask, customPriority: newPriority };
    const updatedTasks = [...tasks];
    updatedTasks.splice(insertIndex, 0, taskWithPriority);

    return updatedTasks;
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
        const { nextTask, insertIndex } = createNextRecurrence(completedTask, activeTasks);

        if (nextTask) {
            // Calculate priority for the new occurrence
            const sameDateTasks = activeTasks.filter(t =>
                t.dueDate === nextTask.dueDate && !isTaskOverdue(t)
            );
            const sameTimeTasks = nextTask.time
                ? sameDateTasks.filter(t => t.time === nextTask.time)
                : sameDateTasks;

            let newPriority;
            if (sameTimeTasks.length > 0) {
                const avgPriority = sameTimeTasks.reduce((sum, t) => sum + (t.customPriority ?? 0), 0) / sameTimeTasks.length;
                newPriority = avgPriority - 0.01;
            } else if (sameDateTasks.length > 0) {
                const avgPriority = sameDateTasks.reduce((sum, t) => sum + (t.customPriority ?? 0), 0) / sameDateTasks.length;
                newPriority = avgPriority - 0.01;
            } else {
                const beforeTask = activeTasks[insertIndex - 1];
                const afterTask = activeTasks[insertIndex];
                if (beforeTask && afterTask) {
                    newPriority = ((beforeTask.customPriority ?? 0) + (afterTask.customPriority ?? 0)) / 2;
                } else if (beforeTask) {
                    newPriority = (beforeTask.customPriority ?? 0) - 1;
                } else if (afterTask) {
                    newPriority = (afterTask.customPriority ?? 0) + 1;
                } else {
                    newPriority = 1;
                }
            }

            const newTaskWithPriority = { ...nextTask, customPriority: newPriority };
            activeTasks.splice(insertIndex, 0, newTaskWithPriority);
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
        const { nextTask, insertIndex } = createNextRecurrence(task, updatedTasks);
        if (nextTask) {
            const prevTask = updatedTasks[insertIndex - 1];
            const nextTaskObj = updatedTasks[insertIndex + 1];

            const prevPriority = prevTask ? prevTask.customPriority : (nextTaskObj ? nextTaskObj.customPriority + 200000 : 200000);
            const nextPriority = nextTaskObj ? nextTaskObj.customPriority : (prevTask ? prevTask.customPriority - 200000 : 0);

            nextTask.customPriority = (prevPriority + nextPriority) / 2;
            updatedTasks.splice(insertIndex, 0, nextTask);
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
