"use client";

import { useState } from "react";
import { UploadButton } from "../features/pdf-upload/UploadButton";
import { DragDropArea } from "../features/pdf-upload/DragDropArea";
import { UploadProgress } from "../features/pdf-upload/UploadProgress";
import { UploadedPapersList } from "../features/pdf-upload/UploadedPapersList";
import { ChatHistoryPanel } from "../features/chat-history/ChatHistoryPanel";
import { FileText, MessageSquare } from "lucide-react";

type SidebarTab = 'documents' | 'chats';

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('documents');

  return (
    <aside className="w-80 border-r border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="flex items-center p-2 border-b border-border gap-1 bg-surface-elevated/50">
        <button 
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'documents' 
              ? 'bg-surface border border-border text-foreground shadow-sm' 
              : 'text-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
        <button 
          onClick={() => setActiveTab('chats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'chats' 
              ? 'bg-surface border border-border text-foreground shadow-sm' 
              : 'text-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chats
        </button>
      </div>

      {activeTab === 'documents' ? (
        <>
          <div className="p-4 border-b border-border flex flex-col overflow-y-auto max-h-[60%]">
            <div className="space-y-4 shrink-0">
              <UploadButton />
              <DragDropArea />
            </div>
            <UploadProgress />
          </div>
          
          <div className="flex-1 overflow-hidden p-4">
            <UploadedPapersList />
          </div>
        </>
      ) : (
        <ChatHistoryPanel />
      )}
    </aside>
  );
}
