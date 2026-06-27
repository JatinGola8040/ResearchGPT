"use client";

import { Sparkles, Settings, User, Zap, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#030304]/70 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 z-50 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all">
      {/* Left Brand Identity */}
      <div className="flex items-center gap-3.5">
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 via-purple-500/15 to-transparent border border-white/[0.15] shadow-[0_0_20px_rgba(56,189,248,0.25)] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
        </motion.div>
        <div className="flex items-center gap-2.5">
          <span className="font-black text-xl tracking-tight text-white font-sans drop-shadow-sm">
            Research<span className="neon-gradient-text font-extrabold">GPT</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/10 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <Zap className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400 animate-bounce" /> STUDIO
          </span>
        </div>
      </div>

      {/* Right Controls & Pills */}
      <div className="flex items-center gap-4">
        {/* Cleaner Pill Component for Engine */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131418]/90 border border-white/[0.08] text-xs text-zinc-300 shadow-inner hover:border-white/[0.15] transition-all">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono font-medium tracking-wide">Gemini 3.1 Pro</span>
        </div>

        {/* Animated AI Ready Indicator Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 relative shadow-[0_0_8px_#34d399]" />
          <span>AI Ready</span>
        </div>

        <div className="h-4 w-[1px] bg-white/[0.1]" />

        {/* Animated Microinteraction Buttons */}
        <div className="flex items-center gap-1.5">
          <motion.button 
            whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-cyan-300 bg-white/[0.02] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer shadow-sm"
            title="Workspace Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-purple-300 bg-white/[0.02] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer shadow-sm"
            title="User Profile"
          >
            <User className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
