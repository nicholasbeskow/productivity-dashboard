import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { isoToDisplay, parseSmartDate } from '../../utils/dateHelpers';

const SemesterCompleteModal = ({ defaultBreakStart, onBeginBreak }) => {
    // Local state for the inputs (isolated from main Dashboard)
    const [nextBreakStart, setNextBreakStart] = useState(defaultBreakStart || '');
    const [nextBreakStartInput, setNextBreakStartInput] = useState(defaultBreakStart ? isoToDisplay(defaultBreakStart) : '');

    const [nextSemesterStart, setNextSemesterStart] = useState('');
    const [nextSemesterStartInput, setNextSemesterStartInput] = useState('');

    const [nextSemesterEnd, setNextSemesterEnd] = useState('');
    const [nextSemesterEndInput, setNextSemesterEndInput] = useState('');

    // Confetti effect
    useEffect(() => {
        let confettiInterval;
        let timeoutId;

        const triggerConfetti = () => {
            confetti({
                particleCount: 7,
                origin: { x: Math.random(), y: -0.1 },
                spread: 360,
                startVelocity: 15,
                gravity: 1,
                ticks: 200,
                zIndex: 150,
                colors: ['#3dd68c', '#facc15', '#ffffff'],
                disableForReducedMotion: true // Performance optimization
            });
        };

        // Initial burst
        triggerConfetti();

        // Start lighter interval
        confettiInterval = setInterval(triggerConfetti, 400); // Reduced frequency for performance

        // Stop after 5 seconds
        timeoutId = setTimeout(() => {
            clearInterval(confettiInterval);
        }, 5000);

        return () => {
            clearInterval(confettiInterval);
            clearTimeout(timeoutId);
        };
    }, []);

    const handleSubmit = () => {
        if (!nextBreakStart || !nextSemesterStart || !nextSemesterEnd) {
            alert('Please fill in all date fields.');
            return;
        }
        onBeginBreak({
            breakStartDate: nextBreakStart,
            semesterStartDate: nextSemesterStart,
            semesterEndDate: nextSemesterEnd
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="liquid-bubble-filled rounded-2xl p-8 max-w-lg w-full relative"
                style={{
                    backdropFilter: 'blur(16px) saturate(180%)',
                    boxShadow: '0 0 40px rgba(61, 214, 140, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-green-glow to-yellow-500 bg-clip-text text-transparent">
                        Semester Complete!
                    </h2>
                    <p className="text-white/80 text-lg leading-relaxed">
                        Congratulations! Time to recharge and celebrate your accomplishments.
                    </p>
                </div>

                {/* Info Section */}
                <div className="mb-6 p-4 rounded-xl bg-green-glow/10 border border-green-glow/30">
                    <p className="text-white/90 text-sm leading-relaxed">
                        <strong className="text-green-glow">What's next?</strong> Set your break dates to track your well-deserved rest, and plan for the upcoming semester.
                    </p>
                </div>

                {/* Form - Inputs now re-render only this component */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Break Start Date
                        </label>
                        <input
                            type="text"
                            value={nextBreakStartInput}
                            onChange={(e) => setNextBreakStartInput(e.target.value)}
                            onBlur={(e) => {
                                const { iso, display } = parseSmartDate(e.target.value);
                                setNextBreakStart(iso);
                                setNextBreakStartInput(display);
                            }}
                            placeholder="MM/DD or MM-DD-YYYY"
                            className="w-full liquid-bubble-filled rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-glow/50 transition-all placeholder-white/30"
                        />
                        <p className="text-xs text-white/50 mt-2">
                            Defaults to the day after semester ended
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Next Semester Start Date
                        </label>
                        <input
                            type="text"
                            value={nextSemesterStartInput}
                            onChange={(e) => setNextSemesterStartInput(e.target.value)}
                            onBlur={(e) => {
                                const { iso, display } = parseSmartDate(e.target.value);
                                setNextSemesterStart(iso);
                                setNextSemesterStartInput(display);
                            }}
                            placeholder="MM/DD or MM-DD-YYYY"
                            className="w-full liquid-bubble-filled rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-glow/50 transition-all placeholder-white/30"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Next Semester End Date
                        </label>
                        <input
                            type="text"
                            value={nextSemesterEndInput}
                            onChange={(e) => setNextSemesterEndInput(e.target.value)}
                            onBlur={(e) => {
                                const { iso, display } = parseSmartDate(e.target.value);
                                setNextSemesterEnd(iso);
                                setNextSemesterEndInput(display);
                            }}
                            placeholder="MM/DD or MM-DD-YYYY"
                            className="w-full liquid-bubble-filled rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-glow/50 transition-all placeholder-white/30"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-glow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            boxShadow: '0 0 20px rgba(61, 214, 140, 0.3)',
                        }}
                    >
                        Begin Break 🌴
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SemesterCompleteModal;
