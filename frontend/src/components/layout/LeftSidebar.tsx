"use client";

import { useState } from "react";
import { UploadButton } from "../features/pdf-upload/UploadButton";
import { DragDropArea } from "../features/pdf-upload/DragDropArea";
import { UploadProgress } from "../features/pdf-upload/UploadProgress";
import { UploadedPapersList } from "../features/pdf-upload/UploadedPapersList";
import { ChatHistoryPanel } from "../features/chat-history/ChatHistoryPanel";
import { FileText, MessageSquare, Layers } from "lucide-react";

type SidebarTab = 'documents' | 'chats';

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('documents');

  return (
    <aside className="w-80 border-r border-white/[0.08] bg-[#0B0C0E] flex flex-col shrink-0 overflow-hidden z-20 shadow-2xl">
      {/* Segmented Pill Navigator Header */}
      <div className="p-3.5 border-b border-white/[0.08] bg-[#030304]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Repository
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">v2.5</span>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-black/80 border border-white/[0.08] relative shadow-inner">
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'documents' 
                ? 'bg-[#15161C] border border-white/[0.15] text-white shadow-[0_2px_12px_rgba(0,0,0,0.8)]' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'documents' ? 'text-cyan-400' : ''}`} />
            Sources
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'chats' 
                ? 'bg-[#15161C] border border-white/[0.15] text-white shadow-[0_2px_12px_rgba(0,0,0,0.8)]' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'chats' ? 'text-purple-400' : ''}`} />
            History
          </button>
        </div>
      </div>

      {activeTab === 'documents' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.08] flex flex-col overflow-y-auto max-h-[60%] space-y-3.5 bg-[#08090C]/50">
            <UploadButton />
            <DragDropArea />
            <UploadProgress />
          </div>
          
          <div className="flex-1 overflow-hidden p-4 bg-[#030304]/40">
            <UploadedPapersList />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-[#030304]/40">
          <ChatHistoryPanel />
        </div>
      )}
    </aside>
  );
}
