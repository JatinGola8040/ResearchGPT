"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { api } from "../../../lib/api";

export interface Citation {
  paper_title: string;
  page: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am your research assistant. I have analyzed the uploaded PDFs. What would you like to know about them?' }
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
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const data = await api.queryChat(content);
      
      const newAssistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        // fallback fields just in case the backend response shape differs slightly
        content: data.answer || data.response || data.message || "I couldn't process that request.",
        citations: data.citations
      };
      
      setMessages(prev => [...prev, newAssistantMsg]);
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while communicating with the server. Please check your connection and try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              role={msg.role} 
              content={msg.content} 
              citations={msg.citations} 
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border/50 shrink-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          <p className="text-center text-xs text-muted mt-2">
            ResearchGPT can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
