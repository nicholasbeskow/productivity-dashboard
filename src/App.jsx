import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import TasksTab from './components/Tasks/TasksTab';
import StatsTab from './components/Stats/StatsTab';
import SettingsTab from './components/Settings/SettingsTab';
import backupManager from './utils/backupManager';

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

  // Start backup system: automatic snapshots every 5 minutes
  useEffect(() => {
    backupManager.startSnapshotTimer();

    return () => {
      backupManager.stopSnapshotTimer();
    };
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
      case 'tasks':
        return <TasksTab key="tasks" />;
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
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
