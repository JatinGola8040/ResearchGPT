import { useState, useEffect } from "react";
import { Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const THINKING_STEPS = [
  "Reading uploaded papers...",
  "Searching semantic embeddings...",
  "Retrieving citations...",
  "Generating grounded response..."
];

export function TypingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-start gap-3.5 w-full">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-transparent border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
        <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
      </div>
      
      <div className="bg-[#0B0C0E]/90 border border-cyan-500/30 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-mono text-cyan-300 flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            {THINKING_STEPS[stepIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
