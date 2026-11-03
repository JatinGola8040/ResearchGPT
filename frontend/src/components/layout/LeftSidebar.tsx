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
    <aside className="w-80 border-r border-[#EAE9EA] bg-white flex flex-col shrink-0 overflow-hidden z-20 shadow-md">
      {/* Segmented Pill Navigator Header */}
      <div className="p-3.5 border-b border-[#EAE9EA] bg-[#F4EFEC]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#251F21] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#397F70]" /> Repository
          </span>
          <span className="text-[10px] font-mono font-bold text-[#585254] bg-white/[0.04] px-2 py-0.5 rounded border border-[#EAE9EA]">v2.5</span>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-white border border-[#EAE9EA] relative shadow-inner">
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'documents' 
                ? 'bg-[#E8F2EE] border border-[#397F70]/30 text-[#397F70] shadow-sm' 
                : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === 'documents' ? 'text-[#397F70]' : ''}`} />
            Sources
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'chats' 
                ? 'bg-[#E8F2EE] border border-[#397F70]/30 text-[#397F70] shadow-sm' 
                : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'chats' ? 'text-[#8469AE]' : ''}`} />
            History
          </button>
        </div>
      </div>

      {activeTab === 'documents' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#EAE9EA] flex flex-col overflow-y-auto max-h-[60%] space-y-3.5 bg-[#FFFFFF]/50">
            <UploadButton />
            <DragDropArea />
            <UploadProgress />
          </div>
          
          <div className="flex-1 overflow-hidden p-4 bg-[#F4EFEC]/40">
            <UploadedPapersList />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-[#F4EFEC]/40">
          <ChatHistoryPanel />
        </div>
      )}
    </aside>
  );
}
