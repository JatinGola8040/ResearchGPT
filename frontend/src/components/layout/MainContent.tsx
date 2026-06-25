import { Send, Bot, User } from "lucide-react";

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col bg-background relative h-full">
      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start gap-4 max-w-3xl mx-auto w-full">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 bg-surface border border-border p-4 rounded-2xl rounded-tl-none">
            <p className="text-foreground leading-relaxed">
              Hello! I'm your research assistant. I've analyzed the uploaded PDFs. What would you like to know about them?
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 max-w-3xl mx-auto w-full flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-muted" />
          </div>
          <div className="flex-1 bg-surface-elevated p-4 rounded-2xl rounded-tr-none">
            <p className="text-foreground leading-relaxed">
              Can you summarize the main contributions of the Attention paper?
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border/50 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <textarea 
            className="input w-full min-h-[60px] resize-none pr-12 py-3 rounded-xl bg-surface"
            placeholder="Ask a question about your research..."
            rows={1}
          />
          <button className="absolute right-2 bottom-2 p-2 bg-primary hover:bg-primary-hover text-background rounded-lg transition-colors shadow-[0_0_10px_rgba(14,165,233,0.3)] hover:shadow-[0_0_15px_rgba(14,165,233,0.5)]">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-muted mt-2">
          ResearchGPT can make mistakes. Consider verifying important information.
        </p>
      </div>
    </main>
  );
}
