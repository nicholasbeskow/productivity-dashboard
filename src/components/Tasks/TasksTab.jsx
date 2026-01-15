import { CheckSquare, Search, Repeat, Clock, FileText, Filter, ChevronDown, Check } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import SyllabusWizard from '../AI/SyllabusWizard';
import { useTasks } from '../../context/TaskContext';
import { isTaskOverdue } from '../../utils/taskHelpers';
import { getToday, parseLocalDate } from '../../utils/dateHelpers';

const TasksTab = () => {
  // Use centralized task context instead of local state
  const { tasks, isInitialized, createTask, smartReset, setTasks } = useTasks();

  const [taskFilter, setTaskFilter] = useState('all');
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [hiddenCourses, setHiddenCourses] = useState([]); // Blacklist for courses
  const [timeFilter, setTimeFilter] = useState('all');
  const [showRecurring, setShowRecurring] = useState(true);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Wrapper for setTasks to maintain compatibility with TaskList
  const updateTasks = setTasks;

  // Load task filters from localStorage and listen for changes
  useEffect(() => {
    const savedFilter = localStorage.getItem('taskFilter') || 'all';
    setTaskFilter(savedFilter);

    const savedTimeFilter = localStorage.getItem('taskTimeFilter') || 'all';
    setTimeFilter(savedTimeFilter);

    const savedShowRecurring = localStorage.getItem('taskShowRecurring');
    if (savedShowRecurring !== null) {
      setShowRecurring(savedShowRecurring === 'true');
    }

    const handleFilterChange = () => {
      const filter = localStorage.getItem('taskFilter') || 'all';
      setTaskFilter(filter);
    };

    const handleTimeFilterChange = () => {
      const filter = localStorage.getItem('taskTimeFilter') || 'all';
      setTimeFilter(filter);
    };

    const handleShowRecurringChange = () => {
      const show = localStorage.getItem('taskShowRecurring');
      if (show !== null) {
        setShowRecurring(show === 'true');
      }
    };

    window.addEventListener('taskFilterChanged', handleFilterChange);
    window.addEventListener('taskTimeFilterChanged', handleTimeFilterChange);
    window.addEventListener('taskShowRecurringChanged', handleShowRecurringChange);

    return () => {
      window.removeEventListener('taskFilterChanged', handleFilterChange);
      window.removeEventListener('taskTimeFilterChanged', handleTimeFilterChange);
      window.removeEventListener('taskShowRecurringChanged', handleShowRecurringChange);
    };
  }, []);

  const handleFilterChange = (filter) => {
    setTaskFilter(filter);
    localStorage.setItem('taskFilter', filter);
    window.dispatchEvent(new Event('taskFilterChanged'));
  };

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
    localStorage.setItem('taskTimeFilter', filter);
    window.dispatchEvent(new Event('taskTimeFilterChanged'));
  };

  const handleShowRecurringChange = (show) => {
    setShowRecurring(show);
    localStorage.setItem('taskShowRecurring', String(show));
    window.dispatchEvent(new Event('taskShowRecurringChanged'));
  };

  // Extract unique courses from tasks
  const availableCourses = useMemo(() => {
    const courses = new Set();
    tasks.forEach(task => {
      if (task.course) courses.add(task.course);
    });
    return Array.from(courses).sort();
  }, [tasks]);

  // Smart sorting: overdue first, then by due date, then by custom priority
  const sortedTasks = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    return [...tasks]
      .filter(task => {
        // Toggle recurring tasks
        if (!showRecurring && task.templateId) return false;

        // Course Filter (Hidden Courses)
        if (task.course && hiddenCourses.includes(task.course)) return false;

        // First, filter by type (All/Academic/Personal)
        if (taskFilter === 'all') return true;
        if (taskFilter === 'academic') return (task.taskType || 'academic') === 'academic';
        if (taskFilter === 'personal') return task.taskType === 'personal';
        return true;
      })
      .filter(task => {
        // Time Filter
        if (timeFilter === 'all') return true;

        const isOverdue = isTaskOverdue(task);
        if (timeFilter === 'today') {
          // Show Overdue + Due Today
          if (isOverdue) return true;
          if (!task.dueDate) return false;
          const today = getToday();
          return task.dueDate === today;
        }

        if (timeFilter === 'week') {
          // Show Overdue + Due within next 7 days
          if (isOverdue) return true;
          if (!task.dueDate) return false;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysFromNow = new Date(today);
          sevenDaysFromNow.setDate(today.getDate() + 7);
          const taskDate = parseLocalDate(task.dueDate); // Normalize to start of day

          // Check if it's today or in the future, but before 7 days from now
          return taskDate >= today && taskDate <= sevenDaysFromNow;
        }

        if (timeFilter === 'month') {
          // Show Overdue + Due within current month
          if (isOverdue) return true;
          if (!task.dueDate) return false;

          const today = new Date();
          const taskDate = parseLocalDate(task.dueDate);

          // Check if same month and year
          return taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
        }

        if (timeFilter === 'later') {
          // Show Due after this month OR No Due Date (if not overdue)
          if (isOverdue) return false; // Overdue belongs to Today/Week/Month
          if (!task.dueDate) return true; // No date = Later

          const today = new Date();
          const taskDate = parseLocalDate(task.dueDate);

          // Return true if future month or future year
          return taskDate.getMonth() > today.getMonth() || taskDate.getFullYear() > today.getFullYear();
        }

        return true;
      })
      .filter(task => {
        // Second, filter by the search term
        if (!lowerCaseSearch) return true; // Show all if search is empty

        const titleMatch = task.title.toLowerCase().includes(lowerCaseSearch);
        const descMatch = (task.description || '').toLowerCase().includes(lowerCaseSearch);

        return titleMatch || descMatch;
      })
      .sort((a, b) => {
        // 1. Primary Split: Overdue tasks always at the top
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // 2. Secondary Sort: Custom Priority (Highest first)
        // This applies to BOTH overdue and non-overdue groups independently.
        // It allows the user to manually reorder tasks within the overdue section
        // and within the main list.
        const priorityA = a.customPriority ?? 0;
        const priorityB = b.customPriority ?? 0;

        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        // 3. Tie-breakers

        // Due Date (Earliest first)
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          // Same date check
          if (a.dueDate === b.dueDate) {
            // Same day: tasks with times come before tasks without times
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;

            // Both have times: sort by time (earlier first)
            if (a.time && b.time) {
              const aDateTime = new Date(`${a.dueDate}T${a.time}`);
              const bDateTime = new Date(`${b.dueDate}T${b.time}`);
              return aDateTime - bDateTime;
            }
          }

          // Different dates: sort by date
          return parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate);
        }

        // Creation Date (Newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [tasks, taskFilter, timeFilter, showRecurring, searchTerm, hiddenCourses]);

  // Use context's createTask which handles priority correctly
  const handleTaskCreate = (newTask) => {
    createTask(newTask);
  };

  // Use context's smartReset
  const handleSmartReset = () => {
    if (!window.confirm('Reset task order? This will re-sort all tasks by date and creation time, overriding your manual order.')) {
      return;
    }
    smartReset();
  };

  // Handle Smart Import save
  const handleImportTasks = (newTasks) => {
    newTasks.forEach(task => createTask(task));
    setShowSmartImport(false);
  };

  return (
    <div className="h-full p-8 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
      {/* Global Backdrop - closes task menu when clicking away */}
      {openMenuTaskId && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenMenuTaskId(null)}
        />
      )}

      {/* Smart Import Modal */}
      <AnimatePresence>
        {showSmartImport && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSmartImport(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl h-[85vh] pointer-events-auto shadow-2xl rounded-2xl overflow-hidden"
              >
                <SyllabusWizard
                  onBack={() => setShowSmartImport(false)}
                  onSaveTasks={handleImportTasks}
                  existingTasks={tasks}
                />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
              <CheckSquare className="text-green-glow" size={32} />
              Tasks
            </h2>
            <p className="text-text-secondary">
              Manage your tasks and track your progress
            </p>
          </div>

          {/* Smart Import Button */}
          <button
            onClick={() => setShowSmartImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl text-purple-400 font-medium hover:bg-purple-500/20 transition-all"
          >
            <FileText size={18} />
            Smart Import
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Form */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <TaskForm onTaskCreate={handleTaskCreate} />
          </div>

          {/* Task List */}
          <div className="glass-panel p-6" style={{ backdropFilter: 'blur(12px) saturate(180%)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Your Tasks</h3>
              <div className="flex items-center gap-2">
                {/* Empty for now - Buttons moved or removed */}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full bg-zinc-800/30 border border-white/5 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-white/30 focus:border-green-glow/50 focus:outline-none transition-all hover:bg-zinc-800/50"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
              </div>

              {/* Filter Button & Dropdown */}
              <div className={`relative ${showFilterMenu ? 'z-50' : ''}`}>
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${showFilterMenu || taskFilter !== 'all' || timeFilter !== 'all' || hiddenCourses.length > 0
                    ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-lg shadow-green-500/10'
                    : 'bg-zinc-800/40 text-white/70 border-white/5 hover:bg-zinc-800/60 hover:text-white backdrop-blur-md'
                    }`}
                >
                  <Filter size={18} />
                  <span>Filters</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showFilterMenu && (
                  <>
                    {/* Dedicated backdrop for filter menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFilterMenu(false)}
                    />
                    <div
                      className="absolute top-full right-0 mt-2 w-72 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                      style={{
                        backdropFilter: 'blur(12px) saturate(180%)',
                        background: 'rgba(20, 20, 23, 0.85)'
                      }}
                    >
                      <div className="p-4 space-y-5">

                        {/* View (Type) */}
                        <div>
                          <div className="text-[10px] uppercase font-bold text-white/30 mb-2 px-1 tracking-wider">View</div>
                          <div className="flex bg-black/20 p-1 rounded-lg">
                            {['all', 'academic', 'personal'].map((type) => (
                              <button
                                key={type}
                                onClick={() => handleFilterChange(type)}
                                className={`flex-1 capitalize text-xs py-1.5 rounded-md transition-all font-medium ${taskFilter === type
                                  ? 'bg-white/10 text-white shadow-sm'
                                  : 'text-white/40 hover:text-white/70'
                                  }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time Horizon */}
                        <div>
                          <div className="text-[10px] uppercase font-bold text-white/30 mb-2 px-1 tracking-wider">Time Horizon</div>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { id: 'all', label: 'All Time' },
                              { id: 'today', label: 'Today' },
                              { id: 'week', label: 'This Week' },
                              { id: 'month', label: 'This Month' },
                              { id: 'later', label: 'Later' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleTimeFilterChange(opt.id)}
                                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${timeFilter === opt.id
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Recurring Toggle - MOVED to top bar */}

                        {/* Courses Toggle - Only if courses exist */}
                        {availableCourses.length > 0 && (
                          <div className="border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Courses</span>
                              <button
                                onClick={() => setHiddenCourses(hiddenCourses.length === 0 ? availableCourses : [])}
                                className="text-[10px] text-green-400 hover:text-green-300"
                              >
                                {hiddenCourses.length === 0 ? 'Hide All' : 'Show All'}
                              </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-0.5">
                              {availableCourses.map(course => {
                                const isHidden = hiddenCourses.includes(course);
                                return (
                                  <button
                                    type="button"
                                    key={course}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHiddenCourses(prev =>
                                        isHidden ? prev.filter(c => c !== course) : [...prev, course]
                                      );
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${isHidden ? 'text-white/30 hover:bg-white/5' : 'text-white hover:bg-white/5'}`}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isHidden ? 'border-white/10 bg-transparent' : 'border-green-500/50 bg-green-500/20 text-green-400'}`}>
                                      {!isHidden && <Check size={10} />}
                                    </div>
                                    <span className="truncate">{course}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Recurring Toggle Button */}
              <button
                onClick={() => handleShowRecurringChange(!showRecurring)}
                className={`p-2.5 rounded-xl transition-all border ${showRecurring
                  ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-lg shadow-green-500/10'
                  : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/5'}`}
                title={showRecurring ? "Hide Recurring Tasks" : "Show Recurring Tasks"}
              >
                <Repeat size={18} />
              </button>

              {/* Reset Action */}
              <button
                onClick={handleSmartReset}
                className="p-2.5 rounded-xl text-white/20 hover:text-blue-400 hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20"
                title="Smart Reset Order"
              >
                <Clock size={18} />
              </button>
            </div>

            {/* Task List with Fade Animation on Filter Change */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${taskFilter}-${timeFilter}-${showRecurring}-${hiddenCourses.join(',')}-${searchTerm}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <TaskList
                  tasks={sortedTasks}
                  allTasks={tasks}
                  setTasks={updateTasks}
                  openMenuTaskId={openMenuTaskId}
                  setOpenMenuTaskId={setOpenMenuTaskId}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;
