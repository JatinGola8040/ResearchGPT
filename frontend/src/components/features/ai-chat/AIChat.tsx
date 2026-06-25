"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const mockResponses = [
  "That's a great question. Based on the paper, the main contribution is replacing recurrence with self-attention.",
  "Here is a summary of the methodology: They used a 6-layer encoder-decoder stack with multi-head attention.",
  "I couldn't find a direct comparison to ResNet in this document. Would you like me to check the other uploaded papers?",
  "The literature gaps identified suggest that while it's highly parallelizable, long sequence lengths still cause memory bottlenecks."
];

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

  const handleSendMessage = (content: string) => {
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    // Mock API delay and response
    setTimeout(() => {
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const newAssistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: randomResponse };
      setMessages(prev => [...prev, newAssistantMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
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
