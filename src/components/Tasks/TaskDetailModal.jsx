import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Save, X, Trash2, ExternalLink, FileText, Folder, GripVertical, AlertCircle, Clock } from 'lucide-react';
import backupManager from '../../utils/backupManager';

const TaskDetailModal = ({ taskId, onClose }) => {
  const [task, setTask] = useState(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    url: '',
    dueDate: '',
    time: '',
    status: 'not-started',
    taskType: 'academic',
    attachments: []
  });
  const [draggedAttachmentIndex, setDraggedAttachmentIndex] = useState(null);
  const [dragOverAttachmentIndex, setDragOverAttachmentIndex] = useState(null);

  // Load task from localStorage based on taskId
  useEffect(() => {
    const loadTask = () => {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) {
        try {
          const tasks = JSON.parse(storedTasks);
          const foundTask = tasks.find(t => t.id === taskId);
          if (foundTask) {
            setTask(foundTask);
          } else {
            // Task not found, close modal
            onClose();
          }
        } catch (error) {
          console.error('Error loading task:', error);
          onClose();
        }
      } else {
        onClose();
      }
    };

    loadTask();

    // Listen for storage changes to update task
    const handleStorageChange = () => {
      loadTask();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [taskId, onClose]);

  const handleStartEdit = () => {
    if (!task) return;
    setIsEditingDetail(true);
    setEditForm({
      title: task.title,
      description: task.description || '',
      url: task.url || '',
      dueDate: task.dueDate || '',
      time: task.time || '',
      status: task.status,
      taskType: task.taskType || 'academic',
      attachments: task.attachments || []
    });
  };

  const handleCancelEdit = () => {
    setIsEditingDetail(false);
    setEditForm({
      title: '',
      description: '',
      url: '',
      dueDate: '',
      time: '',
      status: 'not-started',
      taskType: 'academic',
      attachments: []
    });
  };

  const handleAttachFilesClick = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('dialog:show-open-dialog');

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const currentAttachments = editForm.attachments || [];
        const newPaths = result.filePaths.filter(path => !currentAttachments.includes(path));
        setEditForm({ ...editForm, attachments: [...currentAttachments, ...newPaths] });
      }
    } catch (error) {
      console.error('Error attaching files:', error);
    }
  };

  const handleRemoveAttachment = (filePathToRemove) => {
    const updatedAttachments = (editForm.attachments || []).filter(path => path !== filePathToRemove);
    setEditForm({ ...editForm, attachments: updatedAttachments });
  };

  const handleAttachmentDragStart = (e, index) => {
    setDraggedAttachmentIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAttachmentDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedAttachmentIndex !== null && draggedAttachmentIndex !== index) {
      setDragOverAttachmentIndex(index);
    }
  };

  const handleAttachmentDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedAttachmentIndex === null || draggedAttachmentIndex === dropIndex) {
      setDraggedAttachmentIndex(null);
      setDragOverAttachmentIndex(null);
      return;
    }

    const items = Array.from(editForm.attachments);
    const [reorderedItem] = items.splice(draggedAttachmentIndex, 1);
    items.splice(dropIndex, 0, reorderedItem);

    setEditForm(prev => ({ ...prev, attachments: items }));
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

  const handleAttachmentDragEnd = () => {
    setDraggedAttachmentIndex(null);
    setDragOverAttachmentIndex(null);
  };

  const handleOpenFile = async (filePath) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:open-path', filePath);
      if (!result.success) {
        console.error('Failed to open file:', result.error);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const handleShowInFolder = async (filePath) => {
    if (!window.require) return;
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('shell:show-item-in-folder', filePath);
      if (!result.success) {
        console.error('Failed to show item in folder:', result.error);
      }
    } catch (error) {
      console.error('Error invoking shell:show-item-in-folder:', error);
    }
  };

  const handleDeleteTask = () => {
    if (!task) return;

    // Check if this is a recurring task instance
    if (task.templateId) {
      // Show popup: Delete instance or template?
      const deleteInstance = window.confirm(
        'Delete this recurring task?\n\n[OK] = Delete just this one instance.\n[Cancel] = Delete the entire series (the template).'
      );

      if (deleteInstance) {
        // Delete just this instance
        const storedTasks = localStorage.getItem('tasks');
        const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

        const updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        backupManager.saveAutoBackup();

        window.dispatchEvent(new Event('storage'));
        onClose();
      } else {
        // Delete the entire template (with safety confirmation)
        const confirmDeleteTemplate = window.confirm(
          `Are you sure you want to delete the entire "${task.title}" template? This will stop it from generating new tasks.`
        );

        if (confirmDeleteTemplate) {
          const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
          const updatedTemplates = templates.filter(t => t.id !== task.templateId);

          localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));
          backupManager.saveAutoBackup();
          window.dispatchEvent(new Event('storage'));

          console.log('[TaskDetailModal] Deleted recurring template');
          onClose();
        }
      }
    } else {
      // Normal task - delete with confirmation
      const confirmed = window.confirm(
        'Are you sure you want to delete this task? This cannot be undone.'
      );

      if (!confirmed) return;

      const storedTasks = localStorage.getItem('tasks');
      const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

      const updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      backupManager.saveAutoBackup();

      window.dispatchEvent(new Event('storage'));
      onClose();
    }
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim() || !task) return;

    // Check if this is a recurring task instance
    if (task.templateId) {
      // Show popup: Edit instance or template?
      const editInstance = window.confirm(
        'Edit this recurring task?\n\n[OK] = Edit just this one instance.\n[Cancel] = Edit the entire series (the template).'
      );

      if (editInstance) {
        // Edit just this instance
        const storedTasks = localStorage.getItem('tasks');
        const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

        const updatedTasks = fullTasksArray.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              dueDate: editForm.dueDate || null,
              time: editForm.time || null,
              status: editForm.status,
              taskType: editForm.taskType,
              attachments: editForm.attachments || []
            };
          }
          return t;
        });

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        backupManager.saveAutoBackup();
        window.dispatchEvent(new Event('storage'));

        console.log('[TaskDetailModal] Saved changes to task instance');
      } else {
        // Edit the template
        const templates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
        const updatedTemplates = templates.map(template => {
          if (template.id === task.templateId) {
            return {
              ...template,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || []
            };
          }
          return template;
        });

        localStorage.setItem('recurringTasks', JSON.stringify(updatedTemplates));

        // Also update all existing instances of this template
        const storedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const updatedTasks = storedTasks.map(t => {
          if (t.templateId === task.templateId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || [],
              // Keep instance-specific fields unchanged
            };
          }
          return t;
        });

        localStorage.setItem('tasks', JSON.stringify(updatedTasks));

        // Also update completed tasks
        const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        const updatedCompletedTasks = completedTasks.map(t => {
          if (t.templateId === task.templateId) {
            return {
              ...t,
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              url: editForm.url.trim() || null,
              time: editForm.time || null,
              taskType: editForm.taskType,
              attachments: editForm.attachments || [],
              // Keep instance-specific fields unchanged
            };
          }
          return t;
        });

        localStorage.setItem('completedTasks', JSON.stringify(updatedCompletedTasks));

        backupManager.saveAutoBackup();
        window.dispatchEvent(new Event('storage'));

        console.log('[TaskDetailModal] Saved changes to template and all instances');
      }
    } else {
      // Normal task - save as usual
      const storedTasks = localStorage.getItem('tasks');
      const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

      const updatedTasks = fullTasksArray.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            url: editForm.url.trim() || null,
            dueDate: editForm.dueDate || null,
            time: editForm.time || null,
            status: editForm.status,
            taskType: editForm.taskType,
            attachments: editForm.attachments || []
          };
        }
        return t;
      });

      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      backupManager.saveAutoBackup();

      window.dispatchEvent(new Event('storage'));
    }

    handleCancelEdit();
  };

  const handleOpenUrl = (url) => {
    if (!url) return;
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        shell.openExternal(url);
      } catch (error) {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  if (!task) {
    return null;
  }

  const taskIsOverdue = (task.dueDate && task.status !== 'complete') ? (() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const dueDate = new Date(task.dueDate + 'T12:00:00');
    return dueDate < now;
  })() : false;

  const formatDetailDateTime = (dateString, timeString) => {
    if (!dateString) return '';

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateString + 'T12:00:00');
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dateDisplay;
    if (diffDays === 0) {
      dateDisplay = 'Today';
    } else if (diffDays === 1) {
      dateDisplay = 'Tomorrow';
    } else {
      dateDisplay = new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const time12 = `${hour12}:${minutes} ${ampm}`;

      if (diffDays === 0 && !taskIsOverdue) {
        const taskDateTime = new Date(`${dateString}T${timeString}`);
        const nowFull = new Date();
        const diffMs = taskDateTime - nowFull;
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        if (diffHours > 0) {
          return `${dateDisplay} » in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
        }
      }

      return `${dateDisplay} » ${time12}`;
    }

    return dateDisplay;
  };

  return (
    <motion.div
      key="detail-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-4">
        {/* Header with Back Button and Edit Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                setIsEditingDetail(false);
              }}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors group"
            >
              <ArrowLeft size={20} className="text-text-tertiary group-hover:text-green-glow transition-colors" />
            </button>
            <h4 className="text-lg font-semibold text-text-primary">
              {isEditingDetail ? 'Edit Task' : 'Task Details'}
            </h4>
          </div>
          {!isEditingDetail && (
            <button
              onClick={handleStartEdit}
              className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-tertiary hover:text-green-glow transition-all"
              title="Edit task"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {/* Task Details Card or Edit Form */}
        <div className="bg-bg-tertiary rounded-lg p-4 border border-bg-primary space-y-4">
          {isEditingDetail ? (
            /* Edit Form */
            <>
              {/* Title Input */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Enter task title"
                  className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                  autoFocus
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter task description (optional)"
                  rows={3}
                  className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow resize-none transition-colors"
                />
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Related Link
                </label>
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                />
              </div>

              {/* Due Date and Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                  />
                </div>
              </div>

              {/* Task Type Toggle */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Task Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, taskType: 'academic' })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      editForm.taskType === 'academic'
                        ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                        : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                    }`}
                  >
                    📚 Academic
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, taskType: 'personal' })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      editForm.taskType === 'personal'
                        ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                        : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                    }`}
                  >
                    🏠 Personal
                  </button>
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-bg-secondary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  File Attachments
                </label>
                <button
                  type="button"
                  onClick={handleAttachFilesClick}
                  className="w-full px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-primary rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Attach More Files
                </button>

                {/* Attached Files List */}
                {editForm.attachments && editForm.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {editForm.attachments.map((filePath, index) => {
                      const fileName = filePath.split(/[\\/]/).pop();
                      const isDragging = draggedAttachmentIndex === index;
                      const isDragOver = dragOverAttachmentIndex === index;
                      return (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleAttachmentDragStart(e, index)}
                          onDragOver={(e) => handleAttachmentDragOver(e, index)}
                          onDrop={(e) => handleAttachmentDrop(e, index)}
                          onDragEnd={handleAttachmentDragEnd}
                          className={`flex items-center gap-2 bg-bg-secondary rounded-lg px-3 py-2 border transition-all ${
                            isDragging ? 'opacity-50 border-green-glow' :
                            isDragOver ? 'border-green-glow shadow-lg' :
                            'border-bg-primary'
                          }`}
                        >
                          {/* Drag Handle */}
                          <div className="text-text-tertiary hover:text-green-glow transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
                            <GripVertical size={16} />
                          </div>

                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={14} className="text-green-glow flex-shrink-0" />
                            <span className="text-xs text-text-primary truncate" title={filePath}>
                              {fileName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleShowInFolder(filePath)}
                              className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                              title="Show in Folder"
                            >
                              <Folder size={14} className="text-green-glow" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenFile(filePath)}
                              className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                              title="Open file"
                            >
                              <ExternalLink size={14} className="text-green-glow" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(filePath)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              title="Remove attachment"
                            >
                              <X size={14} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editForm.title.trim()}
                    className="flex-1 bg-green-glow hover:bg-green-glow/90 disabled:bg-green-glow/50 disabled:cursor-not-allowed text-bg-primary font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 bg-bg-secondary hover:bg-bg-primary border border-bg-primary hover:border-red-500/50 text-text-primary font-semibold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  onClick={handleDeleteTask}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Task
                </button>
              </div>
            </>
          ) : (
            /* Detail View */
            <>
              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'complete'
                      ? 'bg-green-muted text-green-glow'
                      : task.status === 'in-progress'
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-bg-secondary text-text-tertiary'
                  }`}>
                    {task.status === 'complete' ? 'Complete' : task.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                  </span>
                  {taskIsOverdue && (
                    <span className="px-2 py-1 rounded text-xs bg-red-500 text-white font-semibold">
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div>
                  <p className="text-sm text-text-tertiary mb-1">Due Date{task.time && ' & Time'}</p>
                  <p className={`text-sm font-medium ${taskIsOverdue ? 'text-red-500' : 'text-text-primary'}`}>
                    {formatDetailDateTime(task.dueDate, task.time)}
                  </p>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-sm text-text-tertiary mb-1">Description</p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* URL */}
              {task.url && (
                <div>
                  <p className="text-sm text-text-tertiary mb-2">Related Link</p>
                  <button
                    onClick={() => handleOpenUrl(task.url)}
                    className="inline-flex items-center gap-2 text-sm text-green-glow hover:text-green-glow/80 transition-colors group"
                  >
                    <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="underline">Open Link</span>
                  </button>
                </div>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <p className="text-sm text-text-tertiary mb-2">File Attachments</p>
                  <div className="space-y-2">
                    {task.attachments.map((filePath, index) => {
                      const fileName = filePath.split(/[\\/]/).pop();
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2 border border-bg-primary"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={14} className="text-green-glow flex-shrink-0" />
                            <span className="text-xs text-text-primary truncate" title={filePath}>
                              {fileName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleShowInFolder(filePath)}
                              className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                              title="Show in Folder"
                            >
                              <Folder size={14} className="text-green-glow" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenFile(filePath)}
                              className="p-1 hover:bg-green-glow/20 rounded transition-colors"
                              title="Open file"
                            >
                              <ExternalLink size={14} className="text-green-glow" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TaskDetailModal;
