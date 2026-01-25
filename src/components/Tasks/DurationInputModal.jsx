import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Check } from 'lucide-react';
import durationService from '../../services/durationService';

/**
 * DurationInputModal
 * Beautiful modal for logging/editing task duration
 * isEditMode: false = after completion, true = editing prediction
 */
const DurationInputModal = ({ task, isOpen, onClose, onSave, isEditMode = false }) => {
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [headerMessage, setHeaderMessage] = useState('');
    const [isLoadingMessage, setIsLoadingMessage] = useState(true);
    const [confirmCount, setConfirmCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Disable scroll while modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Set message and pre-fill values when modal opens
    useEffect(() => {
        if (isOpen && task) {
            // Reset state
            setConfirmCount(0);

            if (isEditMode) {
                // Edit mode - pre-fill with current prediction and use edit prompt
                const predicted = task.predictedDuration || 0;
                setHours(predicted >= 60 ? String(Math.floor(predicted / 60)) : '');
                setMinutes(predicted > 0 ? String(predicted % 60) : '');

                const editMessages = [
                    `⏱️ "${task.title}"`,
                    task.predictedDuration ? `📝 Update estimate for "${task.title}"` : `📝 Set estimate for "${task.title}"`,
                ];
                setHeaderMessage(editMessages[Math.floor(Math.random() * editMessages.length)]);
            } else {
                // Completion mode - empty fields and congrats message
                setHours('');
                setMinutes('');

                const congratsMessages = [
                    `🎉 Nice work on "${task.title}"!`,
                    `✨ "${task.title}" is done!`,
                    `💪 Crushed it! "${task.title}" complete!`,
                    `🚀 Boom! "${task.title}" off your plate!`,
                    `🏆 Victory! "${task.title}" conquered!`,
                    `⚡ "${task.title}" — smashed it!`,
                    `🌟 Another one done! "${task.title}" ✓`,
                    `🔥 "${task.title}" is history!`,
                    `✅ "${task.title}" — nailed it!`,
                    `🎯 Bullseye! "${task.title}" complete!`,
                    `💫 "${task.title}" — you did it!`,
                    `🙌 Woohoo! "${task.title}" finished!`,
                    `⭐ "${task.title}" — knocked out!`,
                    `🎊 "${task.title}" is in the books!`,
                    `👏 Well done on "${task.title}"!`,
                ];
                setHeaderMessage(congratsMessages[Math.floor(Math.random() * congratsMessages.length)]);
            }
            setIsLoadingMessage(false);
        }
    }, [isOpen, task?.id, isEditMode]);

    const handleSubmit = async () => {
        const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

        if (totalMinutes <= 0) {
            return; // Don't submit if no time entered
        }

        // Only require confirmation for unusual durations (very short or very long)
        const isAbnormal = totalMinutes < 5 || totalMinutes > 240; // <5 min or >4 hours
        if (isAbnormal && confirmCount === 0) {
            setConfirmCount(1);
            return;
        }

        setIsSubmitting(true);

        try {
            // In edit mode, we're updating the prediction estimate (not saving to history)
            // In completion mode, we're logging actual time (save to history)
            if (!isEditMode) {
                // Completion mode - save actual duration to history
                durationService.saveDuration(task, totalMinutes);
            }

            // Call onSave with the minutes and whether it's an edit
            if (onSave) {
                onSave(totalMinutes, isEditMode);
            }

            onClose();
        } catch (error) {
            console.error('[DurationInputModal] Error saving duration:', error);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        // Silently close without saving
        onClose();
    };

    const handleHoursChange = (e) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 24)) {
            setHours(value);
            setConfirmCount(0); // Reset confirm on input change
        }
    };

    const handleMinutesChange = (e) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 59)) {
            setMinutes(value);
            setConfirmCount(0); // Reset confirm on input change
        }
    };

    if (!task) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={handleSkip}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="glass-panel p-6 w-full max-w-md relative">
                            {/* Close button */}
                            <button
                                onClick={handleSkip}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Congratulatory message */}
                            <div className="text-center mb-6">
                                {isLoadingMessage ? (
                                    <div className="h-8 flex items-center justify-center">
                                        <motion.div
                                            className="w-2 h-2 bg-green-glow rounded-full mx-1"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                        />
                                        <motion.div
                                            className="w-2 h-2 bg-green-glow rounded-full mx-1"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                        />
                                        <motion.div
                                            className="w-2 h-2 bg-green-glow rounded-full mx-1"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xl font-semibold text-white">
                                        {headerMessage}
                                    </p>
                                )}
                            </div>

                            {/* Question */}
                            <p className="text-white/70 text-center mb-4">
                                {isEditMode ? 'How long do you think it will take?' : 'How long did it take?'}
                            </p>

                            {/* Time input */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={hours}
                                        onChange={handleHoursChange}
                                        placeholder="0"
                                        className="w-16 h-12 text-center text-2xl font-semibold bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-green-glow focus:outline-none transition-colors"
                                        autoFocus
                                    />
                                    <span className="text-white/50 text-lg">h</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={minutes}
                                        onChange={handleMinutesChange}
                                        placeholder="0"
                                        className="w-16 h-12 text-center text-2xl font-semibold bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-green-glow focus:outline-none transition-colors"
                                    />
                                    <span className="text-white/50 text-lg">m</span>
                                </div>
                            </div>

                            {/* Submit button */}
                            <motion.button
                                onClick={handleSubmit}
                                disabled={isSubmitting || ((parseInt(hours) || 0) === 0 && (parseInt(minutes) || 0) === 0)}
                                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${confirmCount === 0
                                    ? 'bg-green-glow hover:bg-green-glow/90 text-bg-primary'
                                    : 'bg-green-glow/80 text-bg-primary animate-pulse'
                                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:animate-none`}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <motion.div
                                            className="w-5 h-5 border-2 border-bg-primary border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                        />
                                        Saving...
                                    </>
                                ) : confirmCount === 0 ? (
                                    <>
                                        <Clock size={18} />
                                        Log Time
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        Confirm Log
                                    </>
                                )}
                            </motion.button>

                            {/* Skip link */}
                            <button
                                onClick={handleSkip}
                                className="w-full mt-3 text-sm text-white/40 hover:text-white/60 transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default DurationInputModal;
