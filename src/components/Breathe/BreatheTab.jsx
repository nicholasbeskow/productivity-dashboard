import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Play, Pause } from 'lucide-react';

// Define the animation states for the pacer circle
// This cycle is 16 seconds total: In (4s), Hold (4s), Out (6s), Hold (2s)
const pacerVariants = {
  initial: { scale: 1 },
  breatheIn: { scale: 1.5, transition: { duration: 4, ease: 'easeInOut' } },
  holdAfterIn: { scale: 1.5, transition: { duration: 4, ease: 'easeInOut' } },
  breatheOut: { scale: 1, transition: { duration: 6, ease: 'easeInOut' } },
  holdAfterOut: { scale: 1, transition: { duration: 2, ease: 'easeInOut' } },
};

// Define the breathing cycle steps
const instructions = [
  { text: 'Breathe In', duration: 4000, variant: 'breatheIn' },
  { text: 'Hold', duration: 4000, variant: 'holdAfterIn' },
  { text: 'Breathe Out', duration: 6000, variant: 'breatheOut' },
  { text: 'Hold', duration: 2000, variant: 'holdAfterOut' },
];

const BreathingTab = () => {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0); // Current index in the instructions array

  // This effect runs the timer and cycles through the instructions
  useEffect(() => {
    if (!isActive) return;

    // Set a timer for the duration of the current step
    const timer = setTimeout(() => {
      setStep(prevStep => (prevStep + 1) % instructions.length);
    }, instructions[step].duration);

    // Clean up the timer if the component unmounts or isActive changes
    return () => clearTimeout(timer);
  }, [isActive, step]);

  const currentInstruction = instructions[step];

  const toggleActive = () => {
    if (isActive) {
      // If stopping, reset the step to the beginning
      setStep(0);
    }
    setIsActive(!isActive);
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Wind className="text-green-glow" size={32} />
            Breathe
          </h2>
          <p className="text-text-secondary">
            A simple tool to help you calm down and refocus.
          </p>
        </div>

        {/* Pacer UI */}
        <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary flex flex-col items-center justify-center h-[500px] gap-8">

          {/* The Animated Circle */}
          <motion.div
            className="w-64 h-64 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, #1a5c3f, #151922 70%)',
              boxShadow: '0 0 60px rgba(61, 214, 140, 0.3)',
            }}
            variants={pacerVariants}
            animate={isActive ? currentInstruction.variant : 'initial'}
            initial="initial"
          />

          {/* The Animated Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isActive ? currentInstruction.text : 'Ready?'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-center h-16"
            >
              <h3 className="text-4xl font-semibold text-text-primary">
                {isActive ? currentInstruction.text : 'Ready?'}
              </h3>
              {isActive && (
                <p className="text-text-secondary mt-2">
                  for {instructions[step].duration / 1000} seconds
                </p>
              )}
              {!isActive && (
                 <p className="text-text-secondary mt-2">
                  Press start to begin a 16-second cycle.
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Start/Stop Button */}
          <motion.button
            onClick={toggleActive}
            className={`w-20 h-20 rounded-full text-bg-primary flex items-center justify-center transition-all
              ${isActive ? 'bg-bg-tertiary shadow-none' : 'bg-green-glow shadow-glow-strong'}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isActive ? <Pause size={32} className="text-text-secondary" /> : <Play size={32} className="ml-1" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default BreathingTab;
