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

    // ============= PREDICTION RETRY QUEUE =============
    // Queue for failed predictions that will be retried after a delay
    const predictionQueueRef = useRef([]);
    const retryTimeoutRef = useRef(null);

    // Process the prediction retry queue
    const processPredictionQueue = useCallback(async () => {
        if (predictionQueueRef.current.length === 0) return;

        const queue = [...predictionQueueRef.current];
        predictionQueueRef.current = []; // Clear queue before processing

        console.log(`[TaskContext] Retrying ${queue.length} failed predictions...`);

        const history = durationService.getDurationHistory();
        if (history.length === 0) return;

        for (const task of queue) {
            try {
                const prediction = await aiService.predictTaskDuration(task, history);

                if (prediction) {
                    setTasks(prev => prev.map(t => {
                        if (t.id === task.id && !t.predictedDuration) {
                            console.log(`[TaskContext] Retry succeeded for task: ${task.title}`);
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
                console.warn(`[TaskContext] Retry failed for task ${task.id}:`, error.message);
                // Re-queue for another retry later
                predictionQueueRef.current.push(task);
            }

            // Wait between retries to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // If there are still failed predictions, schedule another retry
        if (predictionQueueRef.current.length > 0) {
            retryTimeoutRef.current = setTimeout(() => {
                processPredictionQueue();
            }, 60000); // Retry again in 1 minute
        }
    }, []);

    // Cleanup retry timeout on unmount
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
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

                // Queue failed prediction for retry (likely rate limited)
                predictionQueueRef.current.push(newTask);

                // Schedule retry if not already scheduled
                if (!retryTimeoutRef.current) {
                    console.log('[TaskContext] Scheduling prediction retry in 30 seconds...');
                    retryTimeoutRef.current = setTimeout(() => {
                        retryTimeoutRef.current = null;
                        processPredictionQueue();
                    }, 30000); // Retry after 30 seconds
                }
            }
        }
    }, [processPredictionQueue]);

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

    /**
     * Refresh predictions for incomplete tasks
     * Only refreshes tasks that don't have predictions or have low confidence
     */
    const refreshPredictions = useCallback(async () => {
        if (!durationService.isFeatureEnabled()) {
            return { refreshed: 0, total: 0 };
        }

        const history = durationService.getDurationHistory();
        if (history.length === 0) {
            return { refreshed: 0, total: 0 };
        }

        // Get incomplete tasks that could benefit from a refresh
        const incompleteTasks = tasks.filter(t =>
            t.status !== 'complete' &&
            (!t.predictedDuration || (t.predictionConfidence && t.predictionConfidence < 50))
        );

        if (incompleteTasks.length === 0) {
            return { refreshed: 0, total: 0 };
        }

        let refreshedCount = 0;

        // Process sequentially with delay to respect rate limits
        // Each prediction uses ~3100 tokens, limit is 8000 TPM, so we need ~25s between requests
        // With key rotation, we can go faster but still need meaningful delays
        for (let i = 0; i < incompleteTasks.length; i++) {
            const task = incompleteTasks[i];

            try {
                const prediction = await aiService.predictTaskDuration(task, history);

                if (prediction) {
                    refreshedCount++;
                    setTasks(prev => prev.map(t => {
                        if (t.id === task.id) {
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
                console.warn(`[TaskContext] Failed to predict for task ${task.id}:`, error.message);
            }

            // Wait 25 seconds between requests to respect rate limits
            // (8000 TPM / 3100 tokens = ~2.5 requests per minute per key)
            // This is slow but guarantees no rate limit errors
            if (i < incompleteTasks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 25000));
            }
        }

        return { refreshed: refreshedCount, total: incompleteTasks.length };
    }, [tasks]);

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
        refreshPredictions,

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
