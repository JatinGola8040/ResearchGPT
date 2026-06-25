import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex items-start gap-4 w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-elevated' : 'bg-primary/20'}`}>
        {isUser ? <User className="w-5 h-5 text-muted" /> : <Bot className="w-5 h-5 text-primary" />}
      </div>
      <div className={`flex-1 p-4 rounded-2xl ${isUser ? 'bg-surface-elevated rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'}`}>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
