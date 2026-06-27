"use client";

import { useState } from "react";
import { WelcomeState } from "../features/upload-workspace/WelcomeState";
import { PaperDetails } from "../features/upload-workspace/PaperDetails";
import { AIChat } from "../features/ai-chat/AIChat";
import { FileText, MessageSquare, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ViewState = 'welcome' | 'document' | 'chat';

export function MainContent() {
  const [viewState, setViewState] = useState<ViewState>('chat');

  return (
    <main className="flex-1 flex flex-col bg-[#030304] relative h-full border-r border-white/[0.07] overflow-hidden">
      {/* Ambient Animated Lighting Glows */}
      <div className="ambient-glow-cyan top-10 left-[15%] z-0" />
      <div className="ambient-glow-purple bottom-10 right-[15%] z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Centered Floating Command Capsule */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center p-1 gap-1 rounded-full bg-[#0B0C0E]/90 backdrop-blur-xl border border-white/[0.1] shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
         <button 
           onClick={() => setViewState('welcome')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'welcome' 
               ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 text-white border border-white/[0.2] shadow-[0_0_15px_rgba(56,189,248,0.25)] font-semibold' 
               : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
           }`}
         >
           <Sparkles className={`w-3.5 h-3.5 ${viewState === 'welcome' ? 'text-cyan-400' : ''}`} />
           Overview
         </button>
         <button 
           onClick={() => setViewState('document')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'document' 
               ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 text-white border border-white/[0.2] shadow-[0_0_15px_rgba(56,189,248,0.25)] font-semibold' 
               : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
           }`}
         >
           <FileText className={`w-3.5 h-3.5 ${viewState === 'document' ? 'text-cyan-400' : ''}`} />
           Inspector
         </button>
         <button 
           onClick={() => setViewState('chat')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'chat' 
               ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 text-white border border-white/[0.2] shadow-[0_0_15px_rgba(168,85,247,0.25)] font-semibold' 
               : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
           }`}
         >
           <MessageSquare className={`w-3.5 h-3.5 ${viewState === 'chat' ? 'text-purple-400' : ''}`} />
           Studio Chat
         </button>
      </div>

      <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewState}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {viewState === 'welcome' && <WelcomeState />}
            {viewState === 'document' && <PaperDetails />}
            {viewState === 'chat' && <AIChat />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
