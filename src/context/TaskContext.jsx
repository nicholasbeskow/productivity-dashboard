import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import taskService from '../services/taskService';
import { isTaskOverdue } from '../utils/taskHelpers';
import { aiService } from '../services/aiService';
import durationService from '../services/durationService';

/**
 * TaskContext - Single source of truth for task state
 */
const TaskContext = createContext(null);

/**
 * Custom hook to use the task context
 */
export const useTasks = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};

/**
 * TaskProvider - Wraps the app and provides task state to all components
 */
export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Ref to track pending completion animations
    const completionTimeoutsRef = useRef(new Map());

    // Load tasks from localStorage on mount
    useEffect(() => {
        const loadedTasks = taskService.loadTasks();
        setTasks(loadedTasks);
        setIsInitialized(true);
    }, []);

    // Auto-persist when tasks change (after initialization)
    useEffect(() => {
        if (!isInitialized) return;
        taskService.saveTasks(tasks);
    }, [tasks, isInitialized]);

    // Listen for external storage changes (from other tabs/components)
    useEffect(() => {
        const handleStorageChange = (e) => {
            // Only reload if we didn't trigger this event ourselves
            if (e.key === 'tasks' && e.storageArea === localStorage) {
                const loadedTasks = taskService.loadTasks();
                setTasks(loadedTasks);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            completionTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            completionTimeoutsRef.current.clear();
        };
    }, []);

    // ============= TASK OPERATIONS =============

    const createTask = useCallback(async (newTask) => {
        // First, create the task immediately (no delay for user)
        setTasks(prev => taskService.createTask(prev, newTask));

        // Then, fetch prediction in background if feature enabled
        if (durationService.isFeatureEnabled()) {
            try {
                let prediction = null;

                // For recurring tasks, check for inherited history first
                if (newTask.templateId) {
                    const templateHistory = durationService.getHistoryForTemplate(newTask.templateId);
                    if (templateHistory.length > 0) {
                        prediction = durationService.calculatePrediction(templateHistory);
                    }
                }

                // If no inherited prediction, try AI prediction
                if (!prediction) {
                    const history = durationService.getDurationHistory();
                    if (history.length > 0) {
                        prediction = await aiService.predictTaskDuration(newTask, history);
                    }
                }

                // Update task with prediction if we got one
                if (prediction) {
                    setTasks(prev => prev.map(t => {
                        if (t.id === newTask.id) {
                            return {
                                ...t,
                                predictedDuration: prediction.predictedMinutes,
                                predictionConfidence: prediction.confidencePercent,
                                predictionSampleCount: prediction.sampleCount || 1,
                            };
                        }
                        return t;
                    }));
                }
            } catch (error) {
                console.warn('[TaskContext] Failed to fetch prediction:', error.message);
                // Silently fail - prediction is optional enhancement
            }
        }
    }, []);

    const updateTask = useCallback((taskId, updates) => {
        setTasks(prev => taskService.updateTask(prev, taskId, updates));
    }, []);

    const changeStatus = useCallback((taskId, onComplete) => {
        // Clear any existing timeout for this task
        if (completionTimeoutsRef.current.has(taskId)) {
            clearTimeout(completionTimeoutsRef.current.get(taskId));
            completionTimeoutsRef.current.delete(taskId);
        }

        setTasks(prev => {
            const { updatedTasks, completedTask, newStatus } = taskService.changeStatus(prev, taskId);

            if (newStatus === 'complete' && completedTask) {
                // Schedule completion processing after animation
                const timeoutId = setTimeout(() => {
                    setTasks(currentTasks => taskService.completeTask(currentTasks, taskId, completedTask));
                    completionTimeoutsRef.current.delete(taskId);
                    if (onComplete) onComplete();
                }, 700);

                completionTimeoutsRef.current.set(taskId, timeoutId);
            }

            return updatedTasks;
        });
    }, []);

    const deleteTask = useCallback((taskId, scope = 'instance') => {
        setTasks(prev => taskService.deleteTask(prev, taskId, scope));
    }, []);

    const moveToTop = useCallback((taskId) => {
        setTasks(prev => taskService.moveToTop(prev, taskId));
    }, []);

    const restoreLocation = useCallback((taskId) => {
        // Define compare function for NATURAL chronological order
        // IMPORTANT: Do NOT include customPriority - we want the natural date-based position
        const compareTasks = (a, b) => {
            const aOverdue = isTaskOverdue(a);
            const bOverdue = isTaskOverdue(b);

            // 1. Overdue tasks first
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            if (aOverdue && bOverdue) return new Date(a.dueDate) - new Date(b.dueDate);

            // 2. Tasks with due dates before tasks without
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;

            // 3. Sort by due date (earlier first)
            if (a.dueDate && b.dueDate) {
                if (a.dueDate !== b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                // Same date: sort by time
                if (a.time && !b.time) return -1;
                if (!a.time && b.time) return 1;
                if (a.time && b.time) {
                    return a.time.localeCompare(b.time);
                }
            }

            // 4. Fallback: newer created first
            return new Date(b.createdAt) - new Date(a.createdAt);
        };

        setTasks(prev => taskService.restoreLocation(prev, taskId, compareTasks));
    }, []);

    const duplicateTask = useCallback((taskId) => {
        setTasks(prev => taskService.duplicateTask(prev, taskId));
    }, []);

    const smartReset = useCallback(() => {
        setTasks(prev => taskService.smartReset(prev));
    }, []);

    const reorderTask = useCallback((visibleTasks, draggedTaskId, dropTaskId) => {
        setTasks(prev => taskService.reorderTask(prev, visibleTasks, draggedTaskId, dropTaskId));
    }, []);

    // Context value
    const value = {
        // State
        tasks,
        isInitialized,

        // Operations
        createTask,
        updateTask,
        changeStatus,
        deleteTask,
        moveToTop,
        restoreLocation,
        duplicateTask,
        smartReset,
        reorderTask,

        // Direct setter for advanced use cases
        setTasks,
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};

export default TaskContext;
