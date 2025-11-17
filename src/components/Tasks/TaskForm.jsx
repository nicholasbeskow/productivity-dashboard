import { useState } from 'react';
import { Plus, FileText, UploadCloud, X, Repeat } from 'lucide-react';
import backupManager from '../../utils/backupManager';

const TaskForm = ({ onTaskCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [time, setTime] = useState('');
  const [taskType, setTaskType] = useState('academic');
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState('does-not-repeat');
  const [weeklyDays, setWeeklyDays] = useState([]);

  const handleWeeklyDayToggle = (dayIndex) => {
    setWeeklyDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  // File attachment handlers
  const handleAttachFilesClick = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('dialog:show-open-dialog');

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setAttachments(prev => {
          // Filter out duplicates
          const newPaths = result.filePaths.filter(path => !prev.includes(path));
          return [...prev, ...newPaths];
        });
      }
    } catch (error) {
      console.error('Error attaching files:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    try {
      const files = Array.from(e.dataTransfer.files);
      const filePaths = files.map(file => file.path).filter(Boolean);

      if (filePaths.length > 0) {
        setAttachments(prev => {
          // Filter out duplicates
          const newPaths = filePaths.filter(path => !prev.includes(path));
          return [...prev, ...newPaths];
        });
      }
    } catch (error) {
      console.error('Error handling dropped files:', error);
    }
  };

  const handleRemoveAttachment = (filePathToRemove) => {
    setAttachments(prev => prev.filter(path => path !== filePathToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    // Check if this is a recurring task
    if (recurrenceType !== 'does-not-repeat') {
      // Create a recurring task template instead of a normal task
      const template = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || null,
        time: time || null,
        taskType: taskType,
        attachments: attachments,
        recurrence: {
          type: recurrenceType, // 'daily' or 'weekly'
          days: recurrenceType === 'weekly' ? weeklyDays : [],
        },
        createdAt: new Date().toISOString(),
      };

      // Save to recurringTasks in localStorage
      const existingTemplates = JSON.parse(localStorage.getItem('recurringTasks') || '[]');
      existingTemplates.push(template);
      localStorage.setItem('recurringTasks', JSON.stringify(existingTemplates));

      // Trigger backup
      backupManager.saveAutoBackup();

      // Dispatch storage event to update UI
      window.dispatchEvent(new Event('storage'));

      console.log('[TaskForm] Created recurring task template:', template);

      // Check if this template is due today
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      let isDueToday = false;

      if (template.recurrence.type === 'daily') {
        isDueToday = true;
      } else if (template.recurrence.type === 'weekly') {
        console.log('[TaskForm] Weekly check - Selected days:', template.recurrence.days, 'Today is:', todayDayOfWeek);
        if (template.recurrence.days.includes(todayDayOfWeek)) {
          isDueToday = true;
          console.log('[TaskForm] Weekly task matches today!');
        } else {
          console.log('[TaskForm] Weekly task does NOT match today');
        }
      }

      // If due today, generate the instance immediately
      if (isDueToday) {
        const generatedTask = {
          id: `${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`,
          title: template.title,
          description: template.description,
          url: template.url,
          dueDate: todayString,
          time: template.time,
          status: 'not-started',
          taskType: template.taskType,
          createdAt: new Date().toISOString(),
          completedAt: null,
          attachments: template.attachments,
          customPriority: 0,
          templateId: template.id, // Link back to the template
        };

        // Pass this new instance to the main TaskList
        onTaskCreate(generatedTask);

        console.log('[TaskForm] Generated today\'s instance:', generatedTask);
      }
    } else {
      // Create a normal one-time task
      const newTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || null,
        dueDate: dueDate || null,
        time: time || null,
        status: 'not-started',
        taskType: taskType,
        createdAt: new Date().toISOString(),
        completedAt: null,
        attachments: attachments,
        customPriority: 0,
      };

      onTaskCreate(newTask);
    }

    // Clear form
    setTitle('');
    setDescription('');
    setUrl('');
    setDueDate('');
    setTime('');
    setTaskType('academic');
    setAttachments([]);
    setRecurrenceType('does-not-repeat');
    setWeeklyDays([]);
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Create New Task</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
            required
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            rows={3}
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow resize-none"
          />
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Related Link
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com (optional)"
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
          />
        </div>

        {/* Due Date and Time Row - Only show if not recurring */}
        {recurrenceType === 'does-not-repeat' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Time (optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
              />
            </div>
          </div>
        )}

        {/* Time input for recurring tasks (no date needed as it's generated daily) */}
        {recurrenceType !== 'does-not-repeat' && (
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Time (optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
            />
          </div>
        )}

        {/* Task Type Toggle */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Task Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskType('academic')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'academic'
                  ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
              }`}
            >
              📚 Academic
            </button>
            <button
              type="button"
              onClick={() => setTaskType('personal')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'personal'
                  ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
              }`}
            >
              🏠 Personal
            </button>
          </div>
        </div>

        {/* Recurrence Section */}
        <div>
          <label className="block text-sm text-text-secondary mb-2 flex items-center gap-2">
            <Repeat size={16} />
            Recurrence
          </label>
          <select
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
          >
            <option value="does-not-repeat">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>

          {/* Weekly Day Toggles - Only show when Weekly is selected */}
          {recurrenceType === 'weekly' && (
            <div className="mt-3">
              <p className="text-xs text-text-tertiary mb-2">Repeat on:</p>
              <div className="flex gap-2">
                {[
                  { index: 0, label: 'S' },
                  { index: 1, label: 'M' },
                  { index: 2, label: 'T' },
                  { index: 3, label: 'W' },
                  { index: 4, label: 'T' },
                  { index: 5, label: 'F' },
                  { index: 6, label: 'S' },
                ].map(({ index, label }) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleWeeklyDayToggle(index)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      weeklyDays.includes(index)
                        ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                        : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File Attachments Section */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            File Attachments
          </label>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              isDragging
                ? 'border-green-glow bg-green-glow/10'
                : 'border-bg-primary hover:border-green-glow/50 bg-bg-tertiary/50'
            }`}
          >
            <UploadCloud
              size={32}
              className={`mx-auto mb-2 ${isDragging ? 'text-green-glow' : 'text-text-tertiary'}`}
            />
            <p className="text-sm text-text-secondary mb-2">
              Drag & drop files here
            </p>
            <p className="text-xs text-text-tertiary mb-3">or</p>
            <button
              type="button"
              onClick={handleAttachFilesClick}
              className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-bg-primary hover:border-green-glow/50 text-text-primary rounded-lg transition-all text-sm font-medium"
            >
              <FileText size={16} className="inline mr-2" />
              Browse Files
            </button>
          </div>

          {/* Attached Files List */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((filePath, index) => {
                const fileName = filePath.split(/[\\/]/).pop();
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-bg-tertiary rounded-lg px-3 py-2 border border-bg-primary"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={16} className="text-green-glow flex-shrink-0" />
                      <span className="text-sm text-text-primary truncate" title={filePath}>
                        {fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(filePath)}
                      className="ml-2 p-1 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
                      title="Remove attachment"
                    >
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
        >
          <Plus size={20} />
          {recurrenceType !== 'does-not-repeat' ? 'Create Recurring Task' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
