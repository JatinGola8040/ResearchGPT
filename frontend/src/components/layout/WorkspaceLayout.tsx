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
      <div className="flex flex-col h-screen w-full bg-[#F4EFEC] overflow-hidden text-foreground selection:bg-[#397F70]/30 selection:text-[#397F70]">
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
              className="absolute -left-4 z-50 w-7 h-14 bg-[#FBFCFC]/90 backdrop-blur-xl border border-[#EAE9EA] hover:border-[#397F70]/80 rounded-full flex items-center justify-center text-[#585254] hover:text-[#397F70] shadow-md transition-all cursor-pointer group"
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
            className="overflow-hidden relative shrink-0 z-30 border-l border-[#EAE9EA] bg-white shadow-md"
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
