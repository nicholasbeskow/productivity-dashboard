import { useState } from 'react';
import { Clock, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DurationBadge
 * Displays predicted task duration with edit capability
 */
const DurationBadge = ({ predictedMinutes, confidencePercent, sampleCount, onEdit }) => {
    const [showPopover, setShowPopover] = useState(false);

    // If no prediction/estimate, show "Add Duration" badge
    if (!predictedMinutes || predictedMinutes <= 0) {
        return (
            <motion.button
                onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit();
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded liquid-bubble-filled text-white/30 hover:text-white/70 transition-colors text-xs"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Add duration estimate"
            >
                <Clock size={12} />
                <span className="text-[10px]">+</span>
            </motion.button>
        );
    }

    // Format duration display
    const formatDuration = (minutes) => {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${minutes}m`;
    };

    const handleClick = (e) => {
        e.stopPropagation();
        setShowPopover(!showPopover);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        setShowPopover(false);
        if (onEdit) onEdit();
    };

    return (
        <div className="relative inline-flex">
            <motion.button
                onClick={handleClick}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded liquid-bubble-filled text-white/50 hover:text-white/70 transition-colors text-xs"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Estimated duration"
            >
                <Clock size={12} />
                <span>{formatDuration(predictedMinutes)}</span>
            </motion.button>

            {/* Popover with details */}
            <AnimatePresence>
                {showPopover && (
                    <>
                        {/* Backdrop to close popover */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPopover(false);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                                <div className="text-sm text-white font-medium mb-1">
                                    Estimated: {formatDuration(predictedMinutes)}
                                </div>
                                <div className="text-xs text-white/50">
                                    Confidence: {confidencePercent}%
                                </div>
                                <div className="text-xs text-white/40 mb-2">
                                    Based on {sampleCount} similar task{sampleCount !== 1 ? 's' : ''}
                                </div>
                                {onEdit && (
                                    <button
                                        onClick={handleEdit}
                                        className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-colors"
                                    >
                                        <Pencil size={10} />
                                        Edit
                                    </button>
                                )}
                            </div>
                            {/* Arrow */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#1a1a1a]" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DurationBadge;

