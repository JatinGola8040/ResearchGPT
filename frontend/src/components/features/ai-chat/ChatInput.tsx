"use client";

import { Send, Sparkles, CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const promptSuggestions = [
    "Summarize core methodologies & contributions",
    "Identify unresolved research gaps across papers",
    "Compare empirical benchmarks & dataset evaluations",
    "Synthesize citations into a literature review"
  ];

  return (
    <div className="space-y-3 w-full max-w-4xl mx-auto px-2 pb-2">
      {/* Quick Action Pill Suggestions with Premium Hover Animation */}
      {!disabled && input.length === 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> Suggested Prompts:
          </span>
          {promptSuggestions.map((prompt) => (
            <motion.button
              key={prompt}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSend(prompt)}
              className="px-3 py-1.5 rounded-full bg-[#131418]/90 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 border border-white/[0.08] hover:border-cyan-400/50 text-xs font-mono text-zinc-300 hover:text-white transition-all whitespace-nowrap cursor-pointer shadow-sm"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      )}

      {/* Floating Console Box */}
      <div className="relative w-full rounded-2xl bg-[#0F1014]/90 border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all duration-300 overflow-hidden group">
        <textarea 
          className="w-full min-h-[70px] max-h-[220px] resize-none pr-32 pl-5 pt-4 pb-4 bg-transparent focus:outline-none text-white placeholder-zinc-500 text-sm md:text-base font-sans leading-relaxed"
          placeholder="Query active literature repository... (Enter to Send, Shift + Enter for New Line)"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        
        {/* Floating Controls Footer inside Console */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">
            <CornerDownLeft className="w-2.5 h-2.5" /> Return
          </span>

          <motion.button 
            whileHover={{ scale: disabled || !input.trim() ? 1 : 1.05 }}
            whileTap={{ scale: disabled || !input.trim() ? 1 : 0.94 }}
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-semibold text-xs transition-all duration-200 shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
