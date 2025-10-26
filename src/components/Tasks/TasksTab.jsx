import { CheckSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import TaskForm from './TaskForm';
import TaskList from './TaskList';

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      try {
        setTasks(JSON.parse(storedTasks));
      } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
        setTasks([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save tasks to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks, isInitialized]);

  const handleTaskCreate = (newTask) => {
    setTasks([newTask, ...tasks]);
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <CheckSquare className="text-green-glow" size={32} />
            Tasks
          </h2>
          <p className="text-text-secondary">
            Manage your tasks and track your progress
          </p>
        </div>

        <div className="space-y-6">
          {/* Task Form */}
          <TaskForm onTaskCreate={handleTaskCreate} />

          {/* Task List */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Your Tasks</h3>
            <TaskList tasks={tasks} setTasks={setTasks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
