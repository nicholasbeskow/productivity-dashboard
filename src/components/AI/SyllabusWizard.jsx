import { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, ChevronRight, Loader2, ArrowLeft, X, PenTool } from 'lucide-react';
import { aiService } from '../../services/aiService';

/**
 * SyllabusWizard
 * AI-powered wizard to parse syllabus text into tasks
 * Renders inline within the AI Tab
 */
const SyllabusWizard = ({ onBack, onSaveTasks, existingTasks = [] }) => {
    const [step, setStep] = useState(1); // 1: Input, 2: Review, 3: Success
    const [syllabusText, setSyllabusText] = useState('');
    const [courseName, setCourseName] = useState('');
    const [parsedTasks, setParsedTasks] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [refineInstructions, setRefineInstructions] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const handleProcess = async () => {
        if (!syllabusText.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            const tasks = await aiService.parseSyllabus(syllabusText);

            // Check for duplicates against existing tasks
            const uniqueTasks = tasks.filter(newTask => {
                const isDuplicate = existingTasks.some(existing => {
                    // Match by title (fuzzy) and due date
                    const titleMatch = existing.title.toLowerCase() === newTask.title.toLowerCase();
                    const dateMatch = existing.dueDate === newTask.dueDate;
                    return titleMatch && dateMatch;
                });
                return !isDuplicate;
            });

            if (uniqueTasks.length < tasks.length) {

            }

            // Validate tasks
            if (!Array.isArray(uniqueTasks) || uniqueTasks.length === 0) {
                if (tasks.length > 0 && uniqueTasks.length === 0) {
                    throw new Error('All identified tasks appear to already exist in your dashboard.');
                }
                throw new Error('No tasks could be identified. Please try pasting a clearer format.');
            }

            // Enhance tasks with IDs and defaults
            const enhancedTasks = uniqueTasks.map(t => {
                const task = {
                    ...t,
                    id: crypto.randomUUID(),
                    status: 'not-started',
                    priority: 'medium', // Default
                    category: 'academic', // Assumption for syllabus
                    course: courseName.trim() || null,
                    createdAt: new Date().toISOString()
                };

                // Remove description if it's null, undefined, or empty string
                if (!task.description || task.description.trim() === '') {
                    delete task.description;
                }

                return task;
            });

            setParsedTasks(enhancedTasks);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to process syllabus.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTaskChange = (id, field, value) => {
        setParsedTasks(prev =>
            prev.map(t => t.id === id ? { ...t, [field]: value } : t)
        );
    };

    const handleDeleteTask = (id) => {
        setParsedTasks(prev => prev.filter(t => t.id !== id));
    };

    const handleConfirmImport = () => {
        onSaveTasks(parsedTasks);
        setStep(3);
    };

    const handleFinish = () => {
        onBack();
    };


    const handleRefine = async () => {
        if (!refineInstructions.trim()) return;

        setIsRefining(true);
        try {
            const refinedTasks = await aiService.refineSyllabusTasks(parsedTasks, refineInstructions);
            // Merge with existing tasks to preserve IDs if possible, or just replace
            // For simplicity and to ensure AI changes are reflected, we'll replace the list
            // but we might want to preserve IDs if the AI keeps them? 
            // The AI is instructed to keep fields, but might regenerate IDs if not careful.
            // Let's assume AI returns valid objects. We might need to re-validate dates/times.

            // Re-map to ensure strict structure
            const enhancedRefined = refinedTasks.map(t => ({
                ...t,
                id: t.id || crypto.randomUUID(), // Preserve or generate
                status: t.status || 'not-started',
                course: t.course || courseName.trim() || null,
                dueDate: t.dueDate || null,
                time: t.time || null,
                title: t.title || 'Untitled Task'
            }));

            setParsedTasks(enhancedRefined);
            setRefineInstructions(''); // Clear input on success
        } catch (err) {
            setError(err.message || 'Failed to refine tasks.');
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0e14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-[#0a0e14]/50 backdrop-blur-xl relative">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={step > 1 ? () => setStep(step - 1) : onBack}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors z-50 no-drag"
                        title={step > 1 ? "Back" : "Back to Tools"}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="w-full text-center">
                        <h2 className="text-xl font-bold text-white font-sans">Smart Import</h2>
                        <p className="text-sm text-white/50 font-sans">
                            {step === 1 ? 'Step 1: Paste Text' :
                                step === 2 ? 'Step 2: Review Tasks' :
                                    'Step 3: Complete'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 relative">

                {step === 1 && (
                    <div className="flex flex-col h-full space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <p className="text-sm text-blue-200 flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Tip:</strong> Paste a syllabus, a Canvas gradebook export, or just a messy list of todos.
                                </span>
                            </p>
                        </div>
                        <input
                            type="text"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            placeholder="e.g. BIO 101"
                            className="w-full liquid-bubble-filled rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-lg mb-6 font-sans"
                        />

                        <label className="block text-sm text-white/50 mb-2 font-medium ml-1">Paste Content</label>
                        <textarea
                            value={syllabusText}
                            onChange={(e) => setSyllabusText(e.target.value)}
                            placeholder="Paste your syllabus, grades, or tasks here..."
                            className="w-full flex-1 liquid-bubble-filled rounded-xl p-6 text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all leading-relaxed custom-scrollbar font-sans"
                        />
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between text-sm text-white/40 pb-2 border-b border-white/5 mx-1">
                            <span>Found {parsedTasks.length} tasks</span>
                        </div>

                        {/* AI Refinement Input */}
                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 flex gap-2">
                            <Sparkles size={16} className="text-purple-400 flex-shrink-0 mt-2.5" />
                            <div className="flex-1">
                                <textarea
                                    value={refineInstructions}
                                    onChange={(e) => setRefineInstructions(e.target.value)}
                                    placeholder="Tell AI to refine these tasks (e.g., 'Remove readings', 'Set all times to 11:59PM')"
                                    className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none resize-none pt-2 font-sans"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleRefine();
                                        }
                                    }}
                                />
                            </div>
                            <button
                                onClick={handleRefine}
                                disabled={isRefining || !refineInstructions.trim()}
                                className={`self-end p-2 rounded-lg transition-all ${isRefining || !refineInstructions.trim()
                                    ? 'text-white/20 cursor-not-allowed'
                                    : 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300'}`}
                            >
                                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} className="rotate-180" />}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {parsedTasks.map((task) => (
                                <div key={task.id} className="relative group bg-[#0a0e14]/40 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all hover:bg-[#0a0e14]/60">
                                    <div className="flex items-start gap-4">
                                        {/* Icon / Badge */}
                                        <div className={`p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5`}>
                                            <PenTool size={18} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title Input */}
                                            <input
                                                type="text"
                                                value={task.title}
                                                onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                                                className="w-full bg-transparent text-white font-semibold text-lg focus:outline-none placeholder-white/20 mb-1"
                                                placeholder="Task Title"
                                            />

                                            {/* Meta Row */}
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                {/* Date Picker */}
                                                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 focus-within:border-purple-500/30 transition-colors">
                                                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Due</span>
                                                    <input
                                                        type="date"
                                                        value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                                                        onChange={(e) => handleTaskChange(task.id, 'dueDate', e.target.value)}
                                                        className="bg-transparent text-xs text-white/80 focus:text-white focus:outline-none cursor-pointer font-medium"
                                                    />
                                                </div>

                                                {/* Time Input */}
                                                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 focus-within:border-purple-500/30 transition-colors">
                                                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Time</span>
                                                    <input
                                                        type="time"
                                                        value={task.time || ''}
                                                        onChange={(e) => handleTaskChange(task.id, 'time', e.target.value)}
                                                        className="bg-transparent text-xs text-white/80 focus:text-white focus:outline-none cursor-pointer font-medium"
                                                    />
                                                </div>
                                            </div>

                                            {/* Description Input */}
                                            <div className="mt-2">
                                                <textarea
                                                    value={task.description || ''}
                                                    onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                                                    placeholder="Description (optional)"
                                                    rows={1}
                                                    className="w-full bg-transparent text-sm text-white/60 focus:text-white focus:outline-none resize-none placeholder-white/20 border-b border-transparent focus:border-white/10 transition-all"
                                                    style={{ minHeight: '24px' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all absolute top-2 right-2"
                                            title="Remove Task"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-6 animate-bounce">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Import Successful!</h3>
                        <p className="text-white/60 max-w-md mx-auto mb-8">
                            {parsedTasks.length} tasks have been added to your dashboard. You can find them in the Tasks tab.
                        </p>
                        <button
                            onClick={handleFinish}
                            className="px-8 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
                        >
                            Back to AI Tools
                        </button>
                    </div>
                )}

            </div>

            {/* Footer */}
            {step !== 3 && (
                <div className="p-6 border-t border-white/5 bg-[#0a0e14]/50 backdrop-blur-xl flex justify-end gap-3">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={step === 1 ? handleProcess : handleConfirmImport}
                        disabled={isProcessing || (step === 1 && (!syllabusText.trim() || !courseName.trim())) || (step === 2 && parsedTasks.length === 0)}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all ${isProcessing || (step === 1 && (!syllabusText.trim() || !courseName.trim())) || (step === 2 && parsedTasks.length === 0)
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/25'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                AI Analyzing...
                            </>
                        ) : step === 1 ? (
                            <>
                                Analyze Syllabus <ChevronRight size={18} />
                            </>
                        ) : (
                            <>
                                Import {parsedTasks.length} Tasks
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SyllabusWizard;
