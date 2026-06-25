"use client";

import { useState } from "react";
import { WelcomeState } from "../features/upload-workspace/WelcomeState";
import { PaperDetails } from "../features/upload-workspace/PaperDetails";
import { AIChat } from "../features/ai-chat/AIChat";
import { FileText, MessageSquare, Sparkles } from "lucide-react";

type ViewState = 'welcome' | 'document' | 'chat';

export function MainContent() {
  // Mock state: Toggle this to see different views
  const [viewState, setViewState] = useState<ViewState>('chat');

  return (
    <main className="flex-1 flex flex-col bg-background relative h-full border-r border-border">
      {/* 
        For demonstration purposes, small toggle buttons to switch mock states.
      */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
         <button 
           onClick={() => setViewState('welcome')}
           className={`btn btn-sm btn-outline text-xs flex items-center gap-2 bg-surface ${viewState === 'welcome' ? 'border-primary text-primary' : ''}`}
         >
           <Sparkles className="w-3 h-3" />
           Welcome
         </button>
         <button 
           onClick={() => setViewState('document')}
           className={`btn btn-sm btn-outline text-xs flex items-center gap-2 bg-surface ${viewState === 'document' ? 'border-primary text-primary' : ''}`}
         >
           <FileText className="w-3 h-3" />
           Document
         </button>
         <button 
           onClick={() => setViewState('chat')}
           className={`btn btn-sm btn-outline text-xs flex items-center gap-2 bg-surface ${viewState === 'chat' ? 'border-primary text-primary' : ''}`}
         >
           <MessageSquare className="w-3 h-3" />
           Chat
         </button>
      </div>

      {viewState === 'welcome' && <WelcomeState />}
      {viewState === 'document' && <PaperDetails />}
      {viewState === 'chat' && <AIChat />}
    </main>
  );
}
