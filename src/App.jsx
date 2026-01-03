import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import backupManager from './utils/backupManager';
import { getLocalISOString } from './utils/dateHelpers';
import { generateRecurringTasks } from './utils/recurringTaskService';

// Lazy load heavy components to reduce initial bundle size and improve load time
// Dashboard is eager-loaded since it's the initial view
const TasksTab = lazy(() => import('./components/Tasks/TasksTab'));
const CanvasTab = lazy(() => import('./components/Canvas/CanvasTab'));
const StatsTab = lazy(() => import('./components/Stats/StatsTab')); // Heavy: includes Chart.js
const SettingsTab = lazy(() => import('./components/Settings/SettingsTab'));

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data migration: Add taskType to existing tasks
  useEffect(() => {
    // Migrate active tasks
    const tasksString = localStorage.getItem('tasks');
    if (tasksString) {
      try {
        const tasks = JSON.parse(tasksString);
        let needsUpdate = false;

        const updatedTasks = tasks.map(task => {
          if (!task.taskType) {
            needsUpdate = true;
            return { ...task, taskType: 'academic' };
          }
          return task;
        });

        if (needsUpdate) {
          localStorage.setItem('tasks', JSON.stringify(updatedTasks));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (error) {
        console.error('Error migrating tasks:', error);
      }
    }

    // Migrate completed tasks
    const completedString = localStorage.getItem('completedTasks');
    if (completedString) {
      try {
        const completedTasks = JSON.parse(completedString);
        let needsUpdate = false;

        const updatedCompleted = completedTasks.map(task => {
          if (!task.taskType) {
            needsUpdate = true;
            return { ...task, taskType: 'academic' };
          }
          return task;
        });

        if (needsUpdate) {
          localStorage.setItem('completedTasks', JSON.stringify(updatedCompleted));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (error) {
        console.error('Error migrating completed tasks:', error);
      }
    }
  }, []);

  // Continuous recurring task generator - runs on-demand, no midnight scheduling
  // Extracted to separate service for better error handling and testability
  useEffect(() => {
    // Run once on mount to catch up on any missed tasks
    // No interval needed - task creation/completion already handles generation!
    generateRecurringTasks();
  }, []);

  // Start backup system: automatic snapshots (on launch + daily at midnight)
  useEffect(() => {
    backupManager.setupAutoBackup();

    return () => {
      backupManager.stopAutoBackup();
    };
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
      case 'tasks':
        return <TasksTab key="tasks" />;
      case 'canvas':
        return <CanvasTab key="canvas" />;
      case 'stats':
        return <StatsTab key="stats" />;
      case 'settings':
        return <SettingsTab key="settings" />;
      default:
        return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="h-full"
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/70">Loading...</div>
              </div>
            }>
              {renderTab()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
