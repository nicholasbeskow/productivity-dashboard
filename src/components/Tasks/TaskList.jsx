import { useState, useEffect } from 'react';
import { Check, Circle, Clock } from 'lucide-react';

const TaskList = ({ tasks, setTasks }) => {
  const handleStatusChange = (taskId) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
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

        return { ...task, status: newStatus, completedAt };
      }
      return task;
    });

    setTasks(updatedTasks);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={20} className="text-green-glow" />;
      case 'in-progress':
        return <Clock size={20} className="text-yellow-500" />;
      default:
        return <Circle size={20} className="text-text-tertiary" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl p-8 border border-bg-tertiary text-center">
        <p className="text-text-secondary">No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`bg-bg-secondary rounded-xl p-4 border border-bg-tertiary hover:border-green-glow/30 transition-all ${
            task.status === 'complete' ? 'opacity-75' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Status Button */}
            <button
              onClick={() => handleStatusChange(task.id)}
              className="mt-1 hover:scale-110 transition-transform"
              title={`Click to change status (currently: ${getStatusLabel(task.status)})`}
            >
              {getStatusIcon(task.status)}
            </button>

            {/* Task Content */}
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  task.status === 'complete' ? 'text-text-secondary line-through' : 'text-text-primary'
                }`}
              >
                {task.title}
              </h3>

              {task.description && (
                <p className="text-text-secondary text-sm mb-2">{task.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-text-tertiary">
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Due: {formatDate(task.dueDate)}
                  </span>
                )}
                <span className={`px-2 py-1 rounded ${
                  task.status === 'complete'
                    ? 'bg-green-muted text-green-glow'
                    : task.status === 'in-progress'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-bg-tertiary text-text-tertiary'
                }`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
