"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { LeftSidebar } from "./LeftSidebar";
import { MainContent } from "./MainContent";
import { RightAnalysisPanel } from "./RightAnalysisPanel";
import { UploadProvider } from "../features/pdf-upload/UploadContext";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export function WorkspaceLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  return (
    <UploadProvider>
      <div className="flex flex-col h-screen w-full bg-[#030304] overflow-hidden text-foreground selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          <LeftSidebar />
          
          <MainContent />

          {/* Floating Vertical Collapse/Expand Arrow Button */}
          <div className="relative z-40 flex items-center">
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: "rgba(19, 20, 24, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="absolute -left-4 z-50 w-7 h-14 bg-[#131418]/90 backdrop-blur-xl border border-white/[0.15] hover:border-cyan-400/80 rounded-full flex items-center justify-center text-zinc-400 hover:text-cyan-300 shadow-[0_0_20px_rgba(0,0,0,0.9)] transition-all cursor-pointer group"
              title={isDrawerOpen ? "Collapse Intelligence Console" : "Expand Intelligence Console"}
            >
              {isDrawerOpen ? (
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              )}
            </motion.button>
          </div>

          {/* Sliding Animated Drawer Container */}
          <motion.div
            initial={false}
            animate={{ width: isDrawerOpen ? 320 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="overflow-hidden relative shrink-0 z-30 border-l border-white/[0.08] bg-[#0B0C0E] shadow-2xl"
          >
            <div className="w-80 h-full">
              <RightAnalysisPanel />
            </div>
          </motion.div>
        </div>
      </div>
    </UploadProvider>
  );
}
