import { useState, useEffect } from 'react';
import { BookOpen, Check, X, RefreshCw, Clock, ExternalLink, Sparkles, Wand2, Link, AlertTriangle } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import backupManager from '../../utils/backupManager';
import { aiService } from '../../services/aiService';

const CanvasTab = () => {
  const { tasks, createTask, updateTask } = useTasks();

  const [newAssignments, setNewAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [mergeCandidates, setMergeCandidates] = useState({}); // { assignmentId: { taskId, reason } }
  const [isMatching, setIsMatching] = useState(false);
  const [examiningMerge, setExaminingMerge] = useState(null); // { assignment, matchDetails, existingTask, proposedTask }
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, onCancel }

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

        // Trigger AI matching for unseen assignments
        checkMatches(unseenAssignments);
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

  // Check for matches with AI
  const checkMatches = async (assignments) => {
    setIsMatching(true);
    const candidates = {};

    for (const assignment of assignments) {
      if (!assignment.due_at) continue;

      // 1. Client-side pre-filter: Match by Date (+/- 24h) OR Title similarity
      const assignmentDate = new Date(assignment.due_at).toISOString().split('T')[0];
      const potentialMatches = tasks.filter(t => {
        if (!t.dueDate) return false;
        // Date check
        const taskDate = t.dueDate.split('T')[0];
        if (taskDate === assignmentDate) return true;

        // Simple title check (contains)
        if (t.title.toLowerCase().includes(assignment.name.toLowerCase()) ||
          assignment.name.toLowerCase().includes(t.title.toLowerCase())) return true;

        return false;
      });

      if (potentialMatches.length > 0) {
        // 2. Ask AI to verify
        const aiResult = await aiService.matchCanvasToTasks(assignment, potentialMatches);
        if (aiResult.matchId && aiResult.confidence > 0.7) {
          candidates[assignment.id] = {
            taskId: aiResult.matchId,
            reason: aiResult.reason,
            taskTitle: tasks.find(t => t.id === aiResult.matchId)?.title
          };
        }
      }
    }

    setMergeCandidates(candidates);
    setIsMatching(false);
  };

  // Open Merge Modal
  const handleOpenMerge = (assignment) => {
    const match = mergeCandidates[assignment.id];
    if (!match) return;
    const existingTask = tasks.find(t => t.id === match.taskId);
    if (!existingTask) return;

    // Calculate initial proposed task (Default Merge Logic)
    let time = existingTask.time;
    if (assignment.due_at) {
      const dueDateTime = new Date(assignment.due_at);
      const hours = String(dueDateTime.getHours()).padStart(2, '0');
      const minutes = String(dueDateTime.getMinutes()).padStart(2, '0');
      time = `${hours}:${minutes}`;
    }

    const initialProposed = {
      title: existingTask.title, // Keep title by default
      time: time,
      url: assignment.html_url,
      description: existingTask.description || stripHtml(assignment.description),
      course: assignment.context_name || existingTask.course
    };

    setExaminingMerge({
      assignment,
      matchDetails: match,
      existingTask,
      proposedTask: initialProposed
    });
    setRefinementText('');
  };

  // Handle AI Refinement
  const handleRefineMerge = async () => {
    if (!refinementText.trim() || !examiningMerge) return;

    setIsRefining(true);
    try {
      const result = await aiService.refineTaskMerge(
        examiningMerge.proposedTask,
        examiningMerge.assignment,
        refinementText
      );

      setExaminingMerge(prev => ({
        ...prev,
        proposedTask: {
          ...prev.proposedTask,
          ...result // Override with AI results
        }
      }));
      setRefinementText('');
    } catch (err) {

      alert("Failed to refine. Try again.");
    } finally {
      setIsRefining(false);
    }
  };

  // Confirm Merge (Actual Logic)
  const confirmMerge = () => {
    if (!examiningMerge) return;
    const { assignment, existingTask, proposedTask } = examiningMerge;

    const updates = {
      title: proposedTask.title,
      time: proposedTask.time,
      url: proposedTask.url,
      description: proposedTask.description,
      course: proposedTask.course
    };

    updateTask(existingTask.id, updates);
    handleIgnore(assignment.id); // Mark as processed
    setExaminingMerge(null); // Close modal
  };

  // Handle adding assignment to tasks
  const handleAddTask = async (assignment) => {
    try {
      // 1. Check for existing merge candidate first
      if (mergeCandidates[assignment.id]) {
        const shouldMerge = await showConfirm(
          'Matching Task Found',
          `We found a matching task: "${mergeCandidates[assignment.id].taskTitle}".\n\nMerge this assignment into it instead of creating a duplicate?`
        );
        if (shouldMerge) {
          handleOpenMerge(assignment);
          return;
        }
      }

      // 2. If no candidate, do a "Just-in-Time" check
      // Only do this if we haven't checked yet or if we want to double-check
      // To save tokens/time, we can rely on a quick client-side check to see if it's worth asking AI
      // Or just ask AI if the user clicked "Add" (high intent)

      // Let's do a quick client-side check to see if we should trigger AI confirmation
      if (assignment.due_at) {
        const assignmentDate = new Date(assignment.due_at).toISOString().split('T')[0];
        const potentialMatches = tasks.filter(t => {
          if (!t.dueDate) return false;
          const taskDate = t.dueDate.split('T')[0];
          // Simple date match or very similar title
          return taskDate === assignmentDate ||
            t.title.toLowerCase().includes(assignment.name.toLowerCase()) ||
            assignment.name.toLowerCase().includes(t.title.toLowerCase());
        });

        if (potentialMatches.length > 0) {
          const shouldCheck = await showConfirm(
            'Similar Tasks Exist',
            `There are existing tasks on the same day or with similar names (e.g. "${potentialMatches[0].title}").\n\nCheck for duplicates before adding?`
          );

          if (shouldCheck) {
            setIsMatching(true);
            const aiResult = await aiService.matchCanvasToTasks(assignment, potentialMatches);
            setIsMatching(false);

            if (aiResult.matchId) {
              const matchTitle = tasks.find(t => t.id === aiResult.matchId)?.title;
              const openMerge = await showConfirm(
                'Match Found',
                `Found a match: "${matchTitle}".\n\nOpen merge preview?`
              );
              if (openMerge) {
                // Update state manually so handleMerge works
                const newCandidates = {
                  ...mergeCandidates,
                  [assignment.id]: { taskId: aiResult.matchId, taskTitle: matchTitle }
                };
                setMergeCandidates(newCandidates);

                // Open Modal directly
                const exist = tasks.find(t => t.id === aiResult.matchId);
                if (exist) {
                  setExaminingMerge({
                    assignment,
                    matchDetails: { taskId: aiResult.matchId, taskTitle: matchTitle },
                    existingTask: exist,
                    proposedTask: { // Quick default for immediate manual opening
                      title: exist.title,
                      time: assignment.due_at ? new Date(assignment.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : exist.time,
                      url: assignment.html_url,
                      description: exist.description || stripHtml(assignment.description),
                      course: assignment.context_name || exist.course
                    }
                  });
                  return;
                }
              }
            }
          }
        }
      }

      // 3. Fallback to normal Add
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
        const year = dueDateTime.getFullYear();
        const month = String(dueDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(dueDateTime.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;

        const hours = String(dueDateTime.getHours()).padStart(2, '0');
        const minutes = String(dueDateTime.getMinutes()).padStart(2, '0');
        time = `${hours}:${minutes}`;
      }

      const newTask = {
        id: taskId,
        title: assignment.name,
        description: assignment.description ? stripHtml(assignment.description) : `Canvas assignment from ${assignment.context_name}`,
        url: assignment.html_url,
        dueDate: dueDate,
        time: time,
        status: 'not-started',
        taskType: 'academic',
        createdAt: new Date().toISOString(),
        completedAt: null,
        attachments: [],
        course: assignment.context_name, // Important for AI duration prediction matching
      };

      createTask(newTask);
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

  // Custom confirm dialog helper
  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        onConfirm: () => { setConfirmModal(null); resolve(true); },
        onCancel: () => { setConfirmModal(null); resolve(false); }
      });
    });
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
              className="relative z-[51] no-drag flex items-center gap-2 px-6 py-3 liquid-bubble-filled text-green-glow rounded-lg hover:shadow-[0_0_12px_rgba(61,214,140,0.2)] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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

                    {/* Merge Button (visible if match found) */}
                    {mergeCandidates[assignment.id] && (
                      <button
                        onClick={() => handleOpenMerge(assignment)}
                        className="flex items-center gap-2 px-4 py-2 liquid-bubble-filled text-purple-400 rounded-lg hover:shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all font-semibold whitespace-nowrap"
                        style={{ backdropFilter: 'blur(12px) saturate(180%)' }}
                        title="View merge details"
                      >
                        <Link size={18} />
                        Merge
                      </button>
                    )}

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

      {/* Merge Confirmation Modal */}
      {examiningMerge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExaminingMerge(null)}>
          <div className="w-full max-w-2xl bg-[#0a0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Link className="text-purple-400" />
                Confirm Smart Merge
              </h3>
              <button onClick={() => setExaminingMerge(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <p className="text-white/70">
                We'll update your existing task with precise details from Canvas.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Left: Current Task */}
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4">Current Task</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Title</p>
                      <p className="text-white font-medium">{examiningMerge.existingTask.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Time</p>
                      <p className="text-white font-medium">{examiningMerge.existingTask.time || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Link</p>
                      <p className="text-white font-medium truncate">{examiningMerge.existingTask.url ? 'Has Link' : 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Description</p>
                      <p className="text-white text-sm whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{examiningMerge.existingTask.description || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Course</p>
                      <p className="text-white font-medium">{examiningMerge.existingTask.course || 'None'}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Proposed Result (Editable via AI) */}
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-[#0a0e14] border border-white/20 rounded-full p-1 text-white">
                    <RefreshCw size={14} />
                  </div>
                  <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">Proposed Result</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Title</p>
                      <p className="text-white font-medium">{examiningMerge.proposedTask.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Time</p>
                      <p className="text-green-300 font-bold">
                        {examiningMerge.proposedTask.time || 'No time'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Link</p>
                      <p className="text-green-300 font-bold truncate">
                        {examiningMerge.proposedTask.url ? 'Canvas URL' : 'None'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Description</p>
                      <p className="text-green-300 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">{examiningMerge.proposedTask.description || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Course</p>
                      <p className="text-green-300 font-bold">{examiningMerge.proposedTask.course || 'None'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Refinement Input */}
            <div className="mx-6 p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400">
                    <Sparkles size={16} />
                  </div>
                  <input
                    type="text"
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder='e.g. "Keep my description", "Add [Canvas] to title"'
                    className="w-full bg-[#0a0e14] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-white/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleRefineMerge()}
                  />
                </div>
                <button
                  onClick={handleRefineMerge}
                  disabled={isRefining || !refinementText.trim()}
                  className="px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 hover:border-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefining ? <RefreshCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
              <button
                onClick={() => setExaminingMerge(null)}
                className="px-6 py-2 rounded-lg font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                No
              </button>
              <button
                onClick={confirmMerge}
                className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
              >
                <Check size={18} />
                Confirm & Merge
              </button>
            </div>
          </div>
        </div >
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={confirmModal.onCancel}>
          <div className="w-full max-w-md bg-[#0a0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <AlertTriangle className="text-yellow-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
            </div>

            {/* Body */}
            <div className="p-5">
              <p className="text-white/80 whitespace-pre-wrap">{confirmModal.message}</p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
              <button
                onClick={confirmModal.onCancel}
                className="px-5 py-2 rounded-lg font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                No
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-500 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default CanvasTab;
