import { User, Bot, Quote } from "lucide-react";

import { Citation } from "./AIChat";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export function MessageBubble({ role, content, citations }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex items-start gap-4 w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-elevated' : 'bg-primary/20'}`}>
        {isUser ? <User className="w-5 h-5 text-muted" /> : <Bot className="w-5 h-5 text-primary" />}
      </div>
      <div className={`flex-1 flex flex-col gap-2 p-4 rounded-2xl ${isUser ? 'bg-surface-elevated rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'}`}>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {Array.isArray(citations) && citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <h4 className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
              <Quote className="w-3 h-3" />
              Citations
            </h4>
            <div className="flex flex-col gap-2">
              {citations.map((cit, idx) => (
                <div key={idx} className="text-xs text-muted bg-surface-elevated px-3 py-2 rounded-md border border-border/50 flex flex-col gap-1">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <span className="text-primary">[{idx + 1}]</span> 
                    📄 {cit.paper_title}
                  </div>
                  <div className="pl-6 text-[11px]">
                    Page {cit.page}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
