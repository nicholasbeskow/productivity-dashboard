import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import TasksTab from './components/Tasks/TasksTab';
import CanvasTab from './components/Canvas/CanvasTab';
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

  // Midnight scheduler: Generate recurring tasks
  useEffect(() => {
    // Function to generate tasks from recurring templates
    const runMidnightTaskGenerator = () => {
      try {
        console.log('[Task Generator] Running task generator...');

        // Get today's date string (YYYY-MM-DD)
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // Get all recurring task templates
        const templatesString = localStorage.getItem('recurringTasks');
        const templates = templatesString ? JSON.parse(templatesString) : [];

        if (templates.length === 0) {
          console.log('[Task Generator] No recurring templates found.');
          localStorage.setItem('taskGeneratorLastRun', todayString);
          return;
        }

        // Get existing tasks and completed tasks
        const tasksString = localStorage.getItem('tasks');
        const tasks = tasksString ? JSON.parse(tasksString) : [];

        const completedString = localStorage.getItem('completedTasks');
        const completedTasks = completedString ? JSON.parse(completedString) : [];

        // Combine all existing tasks to check for duplicates
        const allExistingTasks = [...tasks, ...completedTasks];

        let newTasksGenerated = 0;

        // Process each template
        templates.forEach(template => {
          let shouldGenerate = false;

          // Check if we should generate a task for today based on recurrence rules
          if (template.recurrence && template.recurrence.type === 'daily') {
            shouldGenerate = true;
          } else if (template.recurrence && template.recurrence.type === 'weekly' && template.recurrence.days) {
            // Get today's day (0 = Sunday, 1 = Monday, etc.)
            const dayOfWeek = today.getDay();

            // Check if today is one of the selected days
            shouldGenerate = template.recurrence.days.includes(dayOfWeek);
          }

          if (!shouldGenerate) {
            return; // Skip this template
          }

          // Check if a task instance for this template already exists for today
          const instanceExistsForToday = allExistingTasks.some(task => {
            return task.templateId === template.id && task.dueDate === todayString;
          });

          if (instanceExistsForToday) {
            console.log(`[Task Generator] Task instance already exists for template "${template.title}" on ${todayString}`);
            return; // Skip - already generated
          }

          // Generate a new task instance with customPriority: 0
          // This allows the task to be sorted by due date automatically
          const newTask = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: template.title,
            description: template.description || '',
            url: template.url || null,
            dueDate: todayString,
            time: template.time || null,
            status: 'not-started',
            taskType: template.taskType || 'academic',
            createdAt: new Date().toISOString(),
            completedAt: null,
            attachments: template.attachments || [],
            customPriority: 0,
            templateId: template.id, // Link to template
            // Note: recurrence property is NOT added to instances
          };

          tasks.push(newTask);
          newTasksGenerated++;
          console.log(`[Task Generator] Generated task instance for template "${template.title}"`);
        });

        if (newTasksGenerated > 0) {
          // Save updated tasks - sorting by due date is handled by TasksTab
          localStorage.setItem('tasks', JSON.stringify(tasks));

          // Trigger backup
          backupManager.saveAutoBackup();

          // Dispatch storage event to update UI
          window.dispatchEvent(new Event('storage'));

          console.log(`[Task Generator] Generated ${newTasksGenerated} new task(s)`);
        } else {
          console.log('[Task Generator] No new tasks generated');
        }

        // Mark that generator ran today
        localStorage.setItem('taskGeneratorLastRun', todayString);
      } catch (error) {
        console.error('[Task Generator] Error generating tasks:', error);
      }
    };

    // Function to schedule the next midnight run
    const scheduleNextMidnightRun = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 1, 0); // Next midnight + 1 second

      const msUntilMidnight = tomorrow - now;

      console.log(`[Task Generator] Scheduling next run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

      const timeoutId = setTimeout(() => {
        console.log('[Task Generator] Midnight reached! Running task generator...');
        runMidnightTaskGenerator();
        scheduleNextMidnightRun(); // Schedule the next run (self-perpetuating)
      }, msUntilMidnight);

      return timeoutId;
    };

    // Check if generator has already run today
    const today = new Date().toISOString().split('T')[0];
    const lastRun = localStorage.getItem('taskGeneratorLastRun');

    if (lastRun !== today) {
      console.log('[Task Generator] Generator has not run today. Running now...');
      runMidnightTaskGenerator();
    } else {
      console.log('[Task Generator] Generator already ran today.');
    }

    // Schedule the next midnight run
    const timeoutId = scheduleNextMidnightRun();

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
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
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
