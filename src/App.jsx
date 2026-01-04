import { useState, useEffect, lazy, Suspense, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import backupManager from './utils/backupManager';
import { getLocalISOString } from './utils/dateHelpers';
import { generateRecurringTasks } from './utils/recurringTaskService';

// Error Boundary to catch errors in lazy-loaded components
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">Something went wrong</div>
            <div className="text-white/70 text-sm">{this.state.error?.message}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-green-glow text-black rounded-lg hover:bg-green-glow/80"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load heavy components to reduce initial bundle size and improve load time
// Dashboard is eager-loaded since it's the initial view
const TasksTab = lazy(() => import('./components/Tasks/TasksTab').catch(err => {
  console.error('Failed to load TasksTab:', err);
  return { default: () => <div className="text-white p-8">Error loading Tasks</div> };
}));
const CanvasTab = lazy(() => import('./components/Canvas/CanvasTab').catch(err => {
  console.error('Failed to load CanvasTab:', err);
  return { default: () => <div className="text-white p-8">Error loading Canvas</div> };
}));
const StatsTab = lazy(() => import('./components/Stats/StatsTab').catch(err => {
  console.error('Failed to load StatsTab:', err);
  return { default: () => <div className="text-white p-8">Error loading Stats</div> };
}));
const SettingsTab = lazy(() => import('./components/Settings/SettingsTab').catch(err => {
  console.error('Failed to load SettingsTab:', err);
  return { default: () => <div className="text-white p-8">Error loading Settings</div> };
}));

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
    <ErrorBoundary>
      <div className="flex h-screen bg-bg-primary overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-hidden" style={{ WebkitAppRegion: 'drag' }}>
          <div className="h-full overflow-hidden">
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
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
