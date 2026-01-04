import { BookOpen, Check, X, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import backupManager from '../../utils/backupManager';
import { isTaskOverdue } from '../../utils/taskHelpers';

const CanvasTab = () => {
  const [newAssignments, setNewAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  // Helper functions for managing processed IDs
  const getProcessedIds = () => {
    return JSON.parse(localStorage.getItem('processedCanvasIds') || '[]');
  };

  const addProcessedId = (id) => {
    const ids = getProcessedIds();
    if (!ids.includes(id)) {
      ids.push(id);
    }
    localStorage.setItem('processedCanvasIds', JSON.stringify(ids));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';

    const date = new Date(dateString);
    const options = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  // Format last synced time
  const formatLastSynced = (date) => {
    if (!date) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Fetch assignments from Canvas
  const fetchAssignments = async () => {
    if (!window.require) {
      setError('Electron not available');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');

      setIsLoading(true);
      setError(null);

      const result = await ipcRenderer.invoke('canvas:fetch-assignments');

      if (result.success) {
        // Filter out assignments we've already processed
        const processedIds = getProcessedIds();
        const unseenAssignments = result.assignments.filter(a => !processedIds.includes(a.id));

        setNewAssignments(unseenAssignments);
        setLastSynced(new Date());
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error fetching Canvas assignments:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ignoring an assignment
  const handleIgnore = (assignmentId) => {
    addProcessedId(assignmentId);
    setNewAssignments(prev => prev.filter(a => a.id !== assignmentId));
    backupManager.saveAutoBackup();
  };

  // Handle adding assignment to tasks
  const handleAddTask = (assignment) => {
    try {
      // Get existing tasks
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

      // Check if task already exists
      const taskId = `canvas-${assignment.id}`;
      const existingTask = tasks.find(t => t.id === taskId);

      if (existingTask) {
        alert('This assignment has already been added to your tasks!');
        return;
      }

      // Parse due date and time from Canvas due_at
      let dueDate = null;
      let time = null;

      if (assignment.due_at) {
        const dueDateTime = new Date(assignment.due_at);

        // Extract date using local timezone (not UTC) to avoid date shifts
        const year = dueDateTime.getFullYear();
        const month = String(dueDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(dueDateTime.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;

        // Extract time using local timezone
        const hours = String(dueDateTime.getHours()).padStart(2, '0');
        const minutes = String(dueDateTime.getMinutes()).padStart(2, '0');
        time = `${hours}:${minutes}`;
      }

      // Find the right position for the new task based on due date
      let insertIndex = tasks.length;

      if (dueDate) {
        const newDueDate = new Date(dueDate + 'T12:00:00');

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];

          // Skip overdue tasks
          if (isTaskOverdue(task)) continue;

          // If task has no due date or later due date, insert before it
          if (!task.dueDate || new Date(task.dueDate + 'T12:00:00') > newDueDate) {
            insertIndex = i;
            break;
          }
        }
      }

      // Create new task
      const newTask = {
        id: taskId,
        title: assignment.name,
        description: assignment.description ? stripHtml(assignment.description).substring(0, 200) : `Canvas assignment from ${assignment.context_name}`,
        url: assignment.html_url,
        dueDate: dueDate,
        time: time,
        status: 'not-started',
        taskType: 'academic',
        createdAt: new Date().toISOString(),
        completedAt: null,
        customPriority: tasks.length - insertIndex + 1,
        attachments: [],
      };

      // Insert task at the right position
      const updatedTasks = [...tasks];
      updatedTasks.splice(insertIndex, 0, newTask);

      // Recalculate all priorities to maintain order
      const tasksWithUpdatedPriorities = updatedTasks.map((task, index) => ({
        ...task,
        customPriority: updatedTasks.length - index,
      }));

      localStorage.setItem('tasks', JSON.stringify(tasksWithUpdatedPriorities));

      // Save backup and trigger updates
      backupManager.saveAutoBackup();
      window.dispatchEvent(new Event('storage'));

      // Mark assignment as processed
      handleIgnore(assignment.id);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task. Please try again.');
    }
  };

  // Strip HTML tags from description
  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Load assignments on mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
                <BookOpen className="text-green-canvas" size={32} />
                Canvas
              </h2>
              <p className="text-text-secondary">
                Review and manage your upcoming Canvas assignments
              </p>
            </div>

            {/* Sync Button */}
            <button
              onClick={fetchAssignments}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 liquid-bubble-filled text-green-glow rounded-lg hover:shadow-[0_0_12px_rgba(61,214,140,0.2)] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backdropFilter: 'blur(12px) saturate(180%)', WebkitAppRegion: 'no-drag' }}
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Last Synced */}
          {lastSynced && (
            <p className="text-sm text-text-tertiary">
              Last synced: {formatLastSynced(lastSynced)}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-panel p-4 mb-6 border-red-500/50" style={{ backdropFilter: 'blur(12px) saturate(180%)', background: 'rgba(239, 68, 68, 0.1)' }}>
            <p className="text-red-500">{error}</p>
            {error.includes('credentials') && (
              <p className="text-sm text-text-tertiary mt-2">
                Go to Settings to configure your Canvas credentials.
              </p>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="glass-panel p-8 text-center" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <RefreshCw className="animate-spin text-green-glow mx-auto mb-4" size={40} />
            <p className="text-text-primary">Loading assignments from Canvas...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && newAssignments.length === 0 && (
          <div className="glass-panel p-8 text-center" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 liquid-bubble-filled" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
                <Check className="text-green-glow" size={40} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                Inbox is empty!
              </h3>
              <p className="text-text-secondary">
                You've processed all your Canvas assignments. Check back later or click "Sync Now" to refresh.
              </p>
            </div>
          </div>
        )}

        {/* Assignments List */}
        {!isLoading && !error && newAssignments.length > 0 && (
          <div className="space-y-4">
            <p className="text-text-secondary mb-4">
              {newAssignments.length} new assignment{newAssignments.length !== 1 ? 's' : ''} to review
            </p>

            {newAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="glass-panel p-6 hover:shadow-[0_0_20px_rgba(61,214,140,0.15)] transition-all"
                style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Assignment Title */}
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {assignment.name}
                    </h3>

                    {/* Course Name */}
                    <p className="text-sm text-text-secondary mb-2">
                      {assignment.context_name}
                    </p>

                    {/* Due Date */}
                    <div className="flex items-center gap-2 text-sm text-text-tertiary mb-3">
                      <Clock size={16} />
                      <span>Due: {formatDate(assignment.due_at)}</span>
                    </div>

                    {/* Canvas Link */}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.require) {
                          const { shell } = window.require('electron');
                          shell.openExternal(assignment.html_url);
                        }
                      }}
                      className="text-sm text-green-glow hover:underline flex items-center gap-1"
                    >
                      View in Canvas
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleAddTask(assignment)}
                      className="flex items-center gap-2 px-4 py-2 liquid-bubble-filled text-green-glow rounded-lg hover:shadow-[0_0_12px_rgba(61,214,140,0.2)] transition-all font-semibold whitespace-nowrap"
                      style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
                      title="Add to Tasks"
                    >
                      <Check size={18} />
                      Add to Tasks
                    </button>

                    <button
                      onClick={() => handleIgnore(assignment.id)}
                      className="flex items-center gap-2 px-4 py-2 liquid-bubble-filled text-red-500 rounded-lg hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all font-semibold"
                      style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
                      title="Ignore"
                    >
                      <X size={18} />
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasTab;
