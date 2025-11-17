import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Check, Circle } from 'lucide-react';
import TaskDetailModal from '../Tasks/TaskDetailModal';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarTab = () => {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [showAgenda, setShowAgenda] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Load all tasks from localStorage (both active and completed)
  useEffect(() => {
    const loadTasks = () => {
      const activeTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');

      const allTasks = [...activeTasks, ...completedTasks];
      setTasks(allTasks);
    };

    loadTasks();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadTasks();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Format tasks into calendar events
  useEffect(() => {
    const formattedEvents = tasks
      .filter(task => task.dueDate) // Only tasks with due dates
      .map(task => {
        const dateStr = task.dueDate;
        let start, end;

        if (task.time) {
          // Task has a specific time
          start = new Date(`${dateStr}T${task.time}`);
          end = new Date(`${dateStr}T${task.time}`);
          // Add 1 hour to end time for display
          end.setHours(end.getHours() + 1);
        } else {
          // All-day event (no specific time)
          start = new Date(dateStr + 'T00:00:00');
          end = new Date(dateStr + 'T23:59:59');
        }

        return {
          title: task.title,
          start: start,
          end: end,
          allDay: !task.time,
          resource: task, // Store the full task object
        };
      });

    setEvents(formattedEvents);
  }, [tasks]);

  // Event style getter - apply completed styling
  const eventPropGetter = (event) => {
    if (event.resource.status === 'complete') {
      return {
        className: 'rbc-event-completed',
      };
    }
    return {};
  };

  // Handle day click - open agenda panel
  const handleSelectSlot = (slotInfo) => {
    const clickedDate = slotInfo.start;
    setSelectedDate(clickedDate);

    // Normalize the clicked date to midnight for comparison
    const clickedDateStr = clickedDate.toISOString().split('T')[0];

    // Filter tasks for this date
    const tasksForDay = tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDateStr = task.dueDate;
      return taskDateStr === clickedDateStr;
    });

    // Sort: Active tasks first, then by time
    tasksForDay.sort((a, b) => {
      // Status priority: not-started and in-progress first, completed last
      const statusOrder = { 'not-started': 0, 'in-progress': 1, 'complete': 2 };
      const aStatus = statusOrder[a.status] || 0;
      const bStatus = statusOrder[b.status] || 0;

      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      // Within same status, sort by time (tasks with time first)
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }

      return 0;
    });

    setSelectedDayTasks(tasksForDay);
    setShowAgenda(true);
  };

  // Format time to 12-hour format
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={16} className="text-green-glow" />;
      case 'in-progress':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <Circle size={16} className="text-text-tertiary" />;
    }
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-text-primary mb-2">Calendar</h2>
          <p className="text-text-secondary">View all your tasks on a calendar. Click any day to see tasks for that day.</p>
        </div>

        <div className="flex gap-6">
          {/* Calendar */}
          <div className={`flex-1 transition-all duration-300 ${showAgenda ? 'mr-0' : 'mr-0'}`}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
              eventPropGetter={eventPropGetter}
              selectable
              onSelectSlot={handleSelectSlot}
              views={['month', 'week', 'day']}
              defaultView="month"
              popup
            />
          </div>

          {/* Agenda Panel (slides in from right) */}
          <AnimatePresence>
            {showAgenda && (
              <motion.div
                initial={{ opacity: 0, x: 100, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 400 }}
                exit={{ opacity: 0, x: 100, width: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-bg-secondary rounded-xl border border-bg-tertiary overflow-hidden flex flex-col"
              >
                {/* Agenda Header */}
                <div className="p-4 border-b border-bg-tertiary flex items-center justify-between bg-bg-tertiary">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {selectedDate && selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <p className="text-sm text-text-tertiary mt-1">
                      {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAgenda(false)}
                    className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
                  >
                    <X size={20} className="text-text-tertiary hover:text-green-glow transition-colors" />
                  </button>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selectedDayTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-text-tertiary">No tasks for this day</p>
                    </div>
                  ) : (
                    selectedDayTasks.map(task => (
                      <motion.button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full text-left bg-bg-tertiary rounded-lg p-3 border transition-all hover:border-green-glow/50 ${
                          task.status === 'complete'
                            ? 'border-bg-primary opacity-70'
                            : 'border-bg-primary'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getStatusIcon(task.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${
                              task.status === 'complete'
                                ? 'text-text-tertiary line-through'
                                : 'text-text-primary'
                            }`}>
                              {task.title}
                            </p>
                            {task.time && (
                              <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                                <Clock size={12} />
                                {formatTime12Hour(task.time)}
                              </p>
                            )}
                            {task.description && (
                              <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Task Detail Modal */}
        <AnimatePresence>
          {selectedTaskId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedTaskId(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-bg-secondary rounded-xl border border-bg-tertiary max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <TaskDetailModal
                  taskId={selectedTaskId}
                  onClose={() => setSelectedTaskId(null)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CalendarTab;
