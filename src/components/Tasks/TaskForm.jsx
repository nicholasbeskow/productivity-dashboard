import { useState, useEffect } from 'react';
import { Plus, FileText, UploadCloud, X, Repeat, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import backupManager from '../../utils/backupManager';
import { getToday, getTomorrow } from '../../utils/dateHelpers';

const TaskForm = ({ onTaskCreate, initialData = null }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [dueDate, setDueDate] = useState(''); // Internal ISO format: YYYY-MM-DD
  const [dateInput, setDateInput] = useState(''); // User input / Display format: MM-DD-YYYY
  const [time, setTime] = useState('');
  const [taskType, setTaskType] = useState('academic');
  const [status, setStatus] = useState('not-started');
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Collapsible section states
  const [showFiles, setShowFiles] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState('does-not-repeat');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState('days');

  // Edit scope for recurring tasks
  const [editScope, setEditScope] = useState('instance');
  const [isRecurringEdit, setIsRecurringEdit] = useState(false);

  // Populate form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setUrl(initialData.url || '');
      setDueDate(initialData.dueDate || '');
      setDateInput(isoToDisplay(initialData.dueDate || ''));
      setTime(initialData.time || '');
      setTaskType(initialData.taskType || 'academic');
      setStatus(initialData.status || 'not-started');
      setAttachments(initialData.attachments || []);

      // Auto-expand sections if they have content
      setShowFiles((initialData.attachments || []).length > 0);
      setShowLinks(!!(initialData.url || ''));

      // BUG FIX: If task instance has templateId but no recurrence, fetch from template
      let recurrence = initialData.recurrence;
      if (!recurrence && initialData.templateId) {
        try {
          const templatesData = localStorage.getItem('recurringTasks') || '[]';
          const templates = JSON.parse(templatesData);
          // Validate that templates is an array
          if (!Array.isArray(templates)) {
            console.error('[TaskForm] Invalid recurringTasks data: expected array');
          } else {
            const template = templates.find(t => t.id === initialData.templateId);
            if (template && template.recurrence) {
              recurrence = template.recurrence;
            } else if (!template) {
              console.warn(`[TaskForm] Orphaned task detected: templateId "${initialData.templateId}" not found. Treating as non-recurring.`);
            }
          }
        } catch (error) {
          console.error('[TaskForm] Error fetching template recurrence:', error);
        }
      }

      // Check if this is a recurring task (has recurrence or templateId)
      const isRecurring = !!(recurrence || initialData.templateId);
      setIsRecurringEdit(isRecurring);
      setShowRecurrence(isRecurring); // Auto-expand recurrence if editing recurring task

      // Handle recurrence fields - crucial for editing recurring tasks
      if (recurrence) {
        const { type, days, interval, unit } = recurrence;

        // Set recurrence type - matches the template type
        setRecurrenceType(type || 'does-not-repeat');

        // Handle weekly recurrence - populate selected days
        if (type === 'weekly' && days) {
          setWeeklyDays(days);
        } else {
          setWeeklyDays([]);
        }

        // Handle custom recurrence - populate interval and unit
        if (type === 'custom') {
          setCustomInterval(interval || 1);
          setCustomUnit(unit || 'days');
        } else {
          setCustomInterval(1);
          setCustomUnit('days');
        }
      } else {
        // No recurrence - reset to defaults
        setRecurrenceType('does-not-repeat');
        setWeeklyDays([]);
        setCustomInterval(1);
        setCustomUnit('days');
      }
    } else {
      // Reset form when initialData becomes null (exit edit mode)
      setTitle('');
      setDescription('');
      setUrl('');
      setDueDate('');
      setDateInput('');
      setTime('');
      setTaskType('academic');
      setAttachments([]);
      setRecurrenceType('does-not-repeat');
      setWeeklyDays([]);
      setCustomInterval(1);
      setCustomUnit('days');
      setIsRecurringEdit(false);
      setEditScope('instance');
      setShowFiles(false);
      setShowLinks(false);
      setShowRecurrence(false);
    }
  }, [initialData]);

  const handleWeeklyDayToggle = (dayIndex) => {
    setWeeklyDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  // Toggle section and close others
  const toggleSection = (section) => {
    if (section === 'files') {
      setShowFiles(!showFiles);
      setShowLinks(false);
      setShowRecurrence(false);
    } else if (section === 'links') {
      setShowLinks(!showLinks);
      setShowFiles(false);
      setShowRecurrence(false);
    } else if (section === 'recurrence') {
      setShowRecurrence(!showRecurrence);
      setShowFiles(false);
      setShowLinks(false);
    }
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

  // Convert ISO date (YYYY-MM-DD) to display format (MM-DD-YYYY)
  const isoToDisplay = (isoDate) => {
    if (!isoDate || !isoDate.trim()) return '';

    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${month}-${day}-${year}`;
    }

    return isoDate;
  };

  // Convert display format (MM-DD-YYYY) to ISO (YYYY-MM-DD)
  const displayToIso = (displayDate) => {
    if (!displayDate || !displayDate.trim()) return '';

    const match = displayDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month}-${day}`;
    }

    return displayDate;
  };

  // Helper function to parse smart date input
  const parseSmartDate = (input) => {
    if (!input || !input.trim()) {
      return { iso: '', display: '' };
    }

    const trimmed = input.trim();

    // Regex patterns for shorthand dates: M/D, MM/DD, M-D, MM-DD
    const shorthandPattern = /^(\d{1,2})[\/\-](\d{1,2})$/;
    const match = trimmed.match(shorthandPattern);

    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      const currentYear = new Date().getFullYear();

      // Return both ISO and display formats
      return {
        iso: `${currentYear}-${month}-${day}`,
        display: `${month}-${day}-${currentYear}`
      };
    }

    // Check if it's already in MM-DD-YYYY format
    const displayMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (displayMatch) {
      const month = displayMatch[1].padStart(2, '0');
      const day = displayMatch[2].padStart(2, '0');
      const year = displayMatch[3];

      return {
        iso: `${year}-${month}-${day}`,
        display: `${month}-${day}-${year}`
      };
    }

    // Check if it's in YYYY-MM-DD format (convert to display)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return {
        iso: trimmed,
        display: isoToDisplay(trimmed)
      };
    }

    // Return as-is if format is unrecognized
    return { iso: trimmed, display: trimmed };
  };

  // Change handler for free typing
  const handleDateChange = (e) => {
    setDateInput(e.target.value);
  };

  // Blur handler for the date input
  const handleDateBlur = (e) => {
    const { iso, display } = parseSmartDate(e.target.value);
    setDueDate(iso);
    setDateInput(display);
  };

  // Due date helper functions
  const setDueToday = () => {
    const today = getToday();
    setDueDate(today);
    setDateInput(isoToDisplay(today));
  };

  const setDueTomorrow = () => {
    const tomorrow = getTomorrow();
    setDueDate(tomorrow);
    setDateInput(isoToDisplay(tomorrow));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Parse date input FIRST to ensure we have current ISO date
    // This handles the case where user hits Enter without blurring the date field
    let finalDueDate = dueDate;
    if (dateInput && dateInput.trim()) {
      const { iso, display } = parseSmartDate(dateInput);
      finalDueDate = iso;
      // Update states for consistency (even though we're about to submit)
      setDueDate(iso);
      setDateInput(display);
    }

    if (!title.trim()) {
      return;
    }

    // Validate dueDate for monthly/yearly/custom recurring tasks (weekly uses day selection)
    if ((recurrenceType === 'monthly' || recurrenceType === 'yearly' || recurrenceType === 'custom') && !finalDueDate) {
      alert('Please select a due date for this recurring task.');
      return;
    }

    // Validate customInterval for custom recurring tasks
    if (recurrenceType === 'custom' && (!customInterval || customInterval < 1)) {
      alert('Please enter a valid interval (minimum 1).');
      return;
    }

    // Validate weekly days selection
    if (recurrenceType === 'weekly' && weeklyDays.length === 0 && finalDueDate) {
      const currentDay = new Date(finalDueDate).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const confirmed = window.confirm(
        `No days selected for weekly recurrence. The task will repeat on ${dayNames[currentDay]}s (based on the due date). Continue?`
      );
      if (!confirmed) return;
    }

    // If editing, pass data to parent with scope
    if (initialData) {
      const updatedTaskData = {
        ...initialData,
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || null,
        dueDate: finalDueDate || null,
        time: time || null,
        taskType: taskType,
        status: status,
        attachments: attachments,
        scope: editScope, // Include edit scope for parent to handle
      };

      // Handle recurrenceAnchor based on edit scope
      if (editScope === 'instance') {
        // Edit instance only: Keep recurrenceAnchor unchanged (preserves original planned date)
        // Explicitly set it to ensure it's included in the returned object
        updatedTaskData.recurrenceAnchor = initialData.recurrenceAnchor || initialData.dueDate || null;
      } else if (editScope === 'series') {
        // Edit series: Update both dueDate and recurrenceAnchor to shift the schedule
        updatedTaskData.recurrenceAnchor = finalDueDate || null;
      }

      // Rebuild recurrence object cleanly (no merging with old data)
      if (recurrenceType !== 'does-not-repeat') {
        const newRecurrence = { type: recurrenceType };

        switch (recurrenceType) {
          case 'daily':
            newRecurrence.interval = 1;
            break;

          case 'weekly':
            newRecurrence.interval = 1;
            // Critical: Derive days from finalDueDate if weeklyDays is empty
            if (weeklyDays && weeklyDays.length > 0) {
              newRecurrence.days = weeklyDays;
            } else if (finalDueDate) {
              // Default to the current weekday from finalDueDate
              const currentDay = new Date(finalDueDate).getDay(); // 0 = Sunday, 6 = Saturday
              newRecurrence.days = [currentDay];
            }
            break;

          case 'monthly':
            newRecurrence.interval = 1;
            break;

          case 'yearly':
            newRecurrence.interval = 1;
            break;

          case 'custom':
            newRecurrence.interval = parseInt(customInterval);
            newRecurrence.unit = customUnit;
            // Sanitize: Derive days from finalDueDate for custom weeks if weeklyDays is empty
            if (customUnit === 'weeks') {
              if (weeklyDays && weeklyDays.length > 0) {
                newRecurrence.days = weeklyDays;
              } else if (finalDueDate) {
                // Default to the current weekday from finalDueDate
                const currentDay = new Date(finalDueDate).getDay();
                newRecurrence.days = [currentDay];
              }
            }
            break;

          default:
            newRecurrence.interval = 1;
        }

        updatedTaskData.recurrence = newRecurrence;
      } else {
        // User changed to does-not-repeat - detach from series
        updatedTaskData.recurrence = null;
      }

      onTaskCreate(updatedTaskData);
      return;
    }

    // Check if this is a recurring task (creating new)
    if (recurrenceType !== 'does-not-repeat') {
      // Create a recurring task template instead of a normal task
      // Build recurrence object cleanly with switch statement
      const newRecurrence = { type: recurrenceType };

      switch (recurrenceType) {
        case 'daily':
          newRecurrence.interval = 1;
          break;

        case 'weekly':
          newRecurrence.interval = 1;
          // Critical: Derive days from finalDueDate if weeklyDays is empty
          if (weeklyDays && weeklyDays.length > 0) {
            newRecurrence.days = weeklyDays;
          } else if (finalDueDate) {
            // Default to the current weekday from finalDueDate
            const currentDay = new Date(finalDueDate).getDay(); // 0 = Sunday, 6 = Saturday
            newRecurrence.days = [currentDay];
          }
          break;

        case 'monthly':
          newRecurrence.interval = 1;
          break;

        case 'yearly':
          newRecurrence.interval = 1;
          break;

        case 'custom':
          newRecurrence.interval = parseInt(customInterval);
          newRecurrence.unit = customUnit;
          // Sanitize: Derive days from finalDueDate for custom weeks if weeklyDays is empty
          if (customUnit === 'weeks') {
            if (weeklyDays && weeklyDays.length > 0) {
              newRecurrence.days = weeklyDays;
            } else if (finalDueDate) {
              // Default to the current weekday from finalDueDate
              const currentDay = new Date(finalDueDate).getDay();
              newRecurrence.days = [currentDay];
            }
          }
          break;

        default:
          newRecurrence.interval = 1;
      }

      const recurrence = newRecurrence;

      const template = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || null,
        time: time || null,
        taskType: taskType,
        attachments: attachments,
        recurrence: recurrence,
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

      // For recurring tasks, always generate at least one instance
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      let instanceDate = todayString;

      if (template.recurrence.type === 'daily') {
        // Daily tasks are always due today
        instanceDate = todayString;
      } else if (template.recurrence.type === 'weekly') {
        // For weekly tasks, find the next occurrence from today based on selected days
        const selectedDays = template.recurrence.days || [];

        if (selectedDays.length > 0) {
          // Find the next occurrence of the selected days
          const sortedDays = selectedDays.sort((a, b) => a - b);
          let daysUntilNext = null;

          // First, check if there's a day later this week
          for (const day of sortedDays) {
            if (day > todayDayOfWeek) {
              daysUntilNext = day - todayDayOfWeek;
              break;
            }
          }

          // If no day found later this week, use the first day next week
          if (daysUntilNext === null) {
            daysUntilNext = 7 - todayDayOfWeek + sortedDays[0];
          }

          // Calculate the next occurrence date
          today.setDate(today.getDate() + daysUntilNext);
          instanceDate = today.toISOString().split('T')[0];
        } else {
          // No specific days: default to 7 days from today
          today.setDate(today.getDate() + 7);
          instanceDate = today.toISOString().split('T')[0];
        }
      } else if (template.recurrence.type === 'monthly') {
        // Monthly tasks use the user-provided finalDueDate
        instanceDate = finalDueDate;
      } else if (template.recurrence.type === 'yearly') {
        // Yearly tasks use the user-provided finalDueDate
        instanceDate = finalDueDate;
      } else if (template.recurrence.type === 'custom') {
        // Custom tasks use the user-provided finalDueDate
        instanceDate = finalDueDate;
      }

      // Generate the instance with the calculated date
      // customPriority: 0 allows the task to be sorted by due date automatically
      const generatedTask = {
        id: `${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`,
        title: template.title,
        description: template.description,
        url: template.url,
        dueDate: instanceDate,
        recurrenceAnchor: instanceDate, // Track original planned date for next calculation
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
    } else {
      // Create a normal one-time task
      const newTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || null,
        dueDate: finalDueDate || null,
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
    setDateInput('');
    setTime('');
    setTaskType('academic');
    setAttachments([]);
    setRecurrenceType('does-not-repeat');
    setWeeklyDays([]);
    setCustomInterval(1);
    setCustomUnit('days');
  };

  return (
    <>
      {/* Show indicator when editing a recurring task */}
      {initialData && initialData.recurrence && initialData.recurrence.type !== 'does-not-repeat' && (
        <div className="mb-4 p-3 liquid-bubble-filled rounded-lg" style={{ boxShadow: '0 0 20px rgba(61, 214, 140, 0.2), inset 0 0 20px rgba(61, 214, 140, 0.05)' }}>
          <p className="text-sm text-green-glow">
            <Repeat size={16} className="inline mr-2" />
            Editing recurring task template - changes will affect future instances
          </p>
        </div>
      )}

      {/* Scope selector for recurring task edits */}
      {isRecurringEdit && (
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-2">Edit Scope</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEditScope('instance')}
              className={`px-4 py-3 rounded-lg transition-all ${
                editScope === 'instance'
                  ? 'text-green-glow liquid-bubble-filled'
                  : 'liquid-bubble-empty text-white/60 hover:text-white/80'
              }`}
              style={editScope === 'instance' ? { boxShadow: '0 0 20px rgba(61, 214, 140, 0.25)' } : {}}
            >
              <div className="font-medium">This Instance Only</div>
              <div className="text-xs mt-1 opacity-80">Update just this one task</div>
            </button>
            <button
              type="button"
              onClick={() => setEditScope('series')}
              className={`px-4 py-3 rounded-lg transition-all ${
                editScope === 'series'
                  ? 'text-green-glow liquid-bubble-filled'
                  : 'liquid-bubble-empty text-white/60 hover:text-white/80'
              }`}
              style={editScope === 'series' ? { boxShadow: '0 0 20px rgba(61, 214, 140, 0.25)' } : {}}
            >
              <div className="font-medium">All Future Tasks</div>
              <div className="text-xs mt-1 opacity-80">Update the entire series</div>
            </button>
          </div>
        </div>
      )}

      <form id={initialData ? 'edit-task-form' : undefined} onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm text-white/50 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-sm text-white/50 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            rows={3}
            className="w-full liquid-bubble-filled rounded-xl p-4 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* Due Date and Time Row - Show for non-weekly tasks OR when editing (even weekly tasks need dates when editing) */}
        {(recurrenceType !== 'weekly' || initialData) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex justify-between items-center text-sm text-white/50 mb-2">
                <span>Due Date</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={setDueToday}
                    className="text-xs px-2 py-0.5 rounded liquid-bubble-empty text-white/60 hover:text-green-glow transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={setDueTomorrow}
                    className="text-xs px-2 py-0.5 rounded liquid-bubble-empty text-white/60 hover:text-green-glow transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              </label>
              <input
                type="text"
                value={dateInput}
                onChange={handleDateChange}
                onBlur={handleDateBlur}
                placeholder="MM/DD or MM-DD-YYYY"
                className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-2">
                Time (optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Time input for weekly tasks (no date needed) - only show when creating new tasks */}
        {recurrenceType === 'weekly' && !initialData && (
          <div>
            <label className="block text-sm text-white/50 mb-2">
              Time (optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Task Type Toggle */}
        <div>
          <label className="block text-sm text-white/50 mb-2">
            Task Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskType('academic')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'academic'
                  ? 'text-green-glow liquid-bubble-filled'
                  : 'liquid-bubble-empty text-white/60 hover:text-white/80'
              }`}
            >
              📚 Academic
            </button>
            <button
              type="button"
              onClick={() => setTaskType('personal')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'personal'
                  ? 'text-green-glow liquid-bubble-filled'
                  : 'liquid-bubble-empty text-white/60 hover:text-white/80'
              }`}
            >
              🏠 Personal
            </button>
          </div>
        </div>

        {/* Task Status Toggle (only shown when editing) */}
        {initialData && (
          <div>
            <label className="block text-sm text-white/50 mb-2">
              Task Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('not-started')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  status === 'not-started'
                    ? 'text-green-glow liquid-bubble-filled'
                    : 'liquid-bubble-empty text-white/60 hover:text-white/80'
                }`}
              >
                Not Started
              </button>
              <button
                type="button"
                onClick={() => setStatus('in-progress')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  status === 'in-progress'
                    ? 'text-green-glow liquid-bubble-filled'
                    : 'liquid-bubble-empty text-white/60 hover:text-white/80'
                }`}
              >
                In Progress
              </button>
            </div>
          </div>
        )}

        {/* Options Section */}
        <div>
          <label className="block text-sm text-white/50 mb-2">
            Options
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleSection('files')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                showFiles
                  ? 'liquid-bubble-filled text-green-glow border border-green-glow/30'
                  : 'liquid-bubble-filled text-white/60 hover:text-green-glow hover:border-green-glow/30'
              }`}
              style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
            >
              <FileText size={14} />
              Files
              {attachments.length > 0 && (
                <span className="text-[10px] bg-green-glow/20 text-green-glow px-1.5 py-0.5 rounded-full">
                  {attachments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('links')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                showLinks
                  ? 'liquid-bubble-filled text-green-glow border border-green-glow/30'
                  : 'liquid-bubble-filled text-white/60 hover:text-green-glow hover:border-green-glow/30'
              }`}
              style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
            >
              <LinkIcon size={14} />
              Link
            </button>
            <button
              type="button"
              onClick={() => toggleSection('recurrence')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                showRecurrence
                  ? 'liquid-bubble-filled text-green-glow border border-green-glow/30'
                  : 'liquid-bubble-filled text-white/60 hover:text-green-glow hover:border-green-glow/30'
              }`}
              style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
            >
              <Repeat size={14} />
              Recurring
            </button>
          </div>
        </div>

        {/* Collapsible Content - Files */}
        {showFiles && (
          <div className="space-y-3">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                isDragging
                  ? 'border-green-glow bg-green-glow/10'
                  : 'border-white/5 hover:border-green-glow/30 liquid-bubble-empty'
              }`}
            >
              <UploadCloud
                size={32}
                className={`mx-auto mb-2 ${isDragging ? 'text-green-glow' : 'text-white/40'}`}
              />
              <p className="text-sm text-white/60 mb-2">
                Drag & drop files here
              </p>
              <p className="text-xs text-white/40 mb-3">or</p>
              <button
                type="button"
                onClick={handleAttachFilesClick}
                className="px-4 py-2 liquid-bubble-filled hover:border-green-glow/50 text-white/80 hover:text-green-glow rounded-lg transition-all text-sm font-medium"
              >
                <FileText size={16} className="inline mr-2" />
                Browse Files
              </button>
            </div>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((filePath, index) => {
                  const fileName = filePath.split(/[\\/]/).pop();
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between liquid-bubble-filled rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={16} className="text-green-glow flex-shrink-0" />
                        <span className="text-sm text-white truncate" title={filePath}>
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
        )}

        {/* Collapsible Content - Links */}
        {showLinks && (
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Collapsible Content - Recurrence */}
        {showRecurrence && (
          <div className="space-y-3">
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              className="w-full liquid-bubble-filled rounded-lg px-4 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
            >
              <option value="does-not-repeat">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>

            {/* Weekly Day Toggles - Only show when Weekly is selected */}
            {recurrenceType === 'weekly' && (
              <div>
                <p className="text-xs text-white/40 mb-2">Repeat on:</p>
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
                          ? 'text-green-glow liquid-bubble-filled'
                          : 'liquid-bubble-empty text-white/60 hover:text-white/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Interval - Only show when Custom is selected */}
            {recurrenceType === 'custom' && (
              <div>
                <p className="text-xs text-white/40 mb-2">Repeat every:</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customInterval}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string while typing
                      if (val === '') {
                        setCustomInterval('');
                      } else {
                        setCustomInterval(val);
                      }
                    }}
                    onBlur={(e) => {
                      // Validate only when user leaves the input
                      const val = e.target.value;
                      if (val === '' || isNaN(parseInt(val))) {
                        setCustomInterval(1);
                      } else {
                        const num = parseInt(val);
                        setCustomInterval(Math.max(1, Math.min(365, num)));
                      }
                    }}
                    className="w-20 liquid-bubble-filled rounded-lg px-3 py-2 text-white text-center focus:border-green-glow/50 focus:outline-none transition-colors"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="flex-1 liquid-bubble-filled rounded-lg px-3 py-2 text-white focus:border-green-glow/50 focus:outline-none transition-colors"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!initialData && (
          <button
            type="submit"
            className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
          >
            <Plus size={20} />
            {recurrenceType !== 'does-not-repeat' ? 'Create Recurring Task' : 'Create Task'}
          </button>
        )}
      </form>
    </>
  );
};

export default TaskForm;
