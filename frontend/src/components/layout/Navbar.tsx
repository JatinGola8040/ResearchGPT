"use client";

import { Sparkles, Settings, User, Zap, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <header className="h-16 border-b border-[#EAE9EA] bg-[#F4EFEC]/90 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 z-50 sticky top-0 shadow-sm transition-all">
      {/* Left Brand Identity */}
      <div className="flex items-center gap-3.5">
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative flex items-center justify-center p-2 rounded-xl bg-[#E8F2EE] border border-[#EAE9EA] shadow-md cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#397F70] animate-pulse" />
        </motion.div>
        <div className="flex items-center gap-2.5">
          <span className="font-black text-xl tracking-tight text-[#251F21] font-sans drop-shadow-sm">
            Research<span className="neon-gradient-text font-extrabold">GPT</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-[#E8F2EE] border border-[#397F70]/40 text-[#397F70] shadow-md">
            <Zap className="w-2.5 h-2.5 text-[#397F70] fill-cyan-400 animate-bounce" /> STUDIO
          </span>
        </div>
      </div>

      {/* Right Controls & Pills */}
      <div className="flex items-center gap-4">
        {/* Cleaner Pill Component for Engine */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBFCFC]/90 border border-[#EAE9EA] text-xs text-[#251F21] shadow-inner hover:border-[#EAE9EA] transition-all">
          <Cpu className="w-3.5 h-3.5 text-[#8469AE]" />
          <span className="font-mono font-medium tracking-wide">gemini-3.5-flash</span>
        </div>

        {/* Animated AI Ready Indicator Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#23825A]/10 border border-[#23825A]/30 text-xs font-mono font-semibold text-[#23825A] shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#23825A] animate-ping absolute" />
          <span className="w-2 h-2 rounded-full bg-[#23825A] relative shadow-sm" />
          <span>AI Ready</span>
        </div>

        <div className="h-4 w-[1px] bg-white/[0.1]" />

        {/* Animated Microinteraction Buttons */}
        <div className="flex items-center gap-1.5">
          <motion.button 
            whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-[#585254] hover:text-[#397F70] bg-white border border-transparent hover:border-[#EAE9EA] transition-all cursor-pointer shadow-sm"
            title="Workspace Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-[#585254] hover:text-[#8469AE] bg-white border border-transparent hover:border-[#EAE9EA] transition-all cursor-pointer shadow-sm"
            title="User Profile"
          >
            <User className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
