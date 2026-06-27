"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { api } from "../../../lib/api";
import { Sparkles, ShieldCheck } from "lucide-react";

export interface Citation {
  paper_title?: string;
  title?: string;
  page?: number | string;
  snippet?: string;
  paper_id?: string;
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoadingCitations?: boolean;
  citationError?: string | null;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am your ResearchGPT studio assistant. I have synthesized your uploaded documents. How can I assist your investigation today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content };
    const tempAssistantId = (Date.now() + 1).toString();
    const loadingAssistantMsg: Message = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      isLoadingCitations: true
    };
    setMessages(prev => [...prev, newUserMsg, loadingAssistantMsg]);
    setIsTyping(true);

    try {
      const data = await api.queryChat(content);
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === tempAssistantId) {
          return {
            id: tempAssistantId,
            role: 'assistant',
            content: data.answer || data.response || data.message || "I couldn't process that request.",
            citations: data.citations || [],
            isLoadingCitations: false
          };
        }
        return msg;
      }));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch AI response and citations.";
      console.error("Chat API Error:", err);
      setMessages(prev => prev.map(msg => {
        if (msg.id === tempAssistantId) {
          return {
            id: tempAssistantId,
            role: 'assistant',
            content: "Sorry, I encountered an error while communicating with the intelligence backend. Please check your connection or verify API availability.",
            citationError: errorMsg,
            isLoadingCitations: false
          };
        }
        return msg;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030304] relative overflow-hidden z-10">
      {/* Studio Stage Header Badge */}
      <div className="px-6 py-3 border-b border-white/[0.06] bg-[#0B0C0E]/70 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          <span className="text-xs font-mono font-bold text-zinc-300 tracking-wider">ACTIVE CHAT SESSION</span>
        </div>
        <div className="flex items-center gap-3.5 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Grounded Context
          </span>
          <span className="text-zinc-600">•</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Strict Retrieval
          </span>
        </div>
      </div>

      {/* Messages Area with Increased Whitespace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 no-scrollbar">
        <div className="max-w-4xl mx-auto w-full space-y-8 pb-4">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              role={msg.role} 
              content={msg.content} 
              citations={msg.citations} 
              isLoadingCitations={msg.isLoadingCitations}
              citationError={msg.citationError}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Console Area */}
      <div className="pt-2 pb-5 px-4 bg-gradient-to-t from-[#030304] via-[#030304]/90 to-transparent shrink-0 z-20">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          <p className="text-center text-[11px] text-zinc-500 font-mono mt-2 tracking-wide">
            ResearchGPT Studio synthesizes citations dynamically. Verify key data against source inspector.
          </p>
        </div>
      </div>
    </div>
  );
}
