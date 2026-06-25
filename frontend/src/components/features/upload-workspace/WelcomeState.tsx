import { Sparkles } from "lucide-react";

export function WelcomeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to ResearchGPT</h2>
      <p className="text-muted max-w-md mx-auto mb-8 leading-relaxed">
        Your unified AI workspace for research. Upload your PDFs using the sidebar to the left to begin analyzing, summarizing, and discovering insights.
      </p>
      <div className="flex items-center gap-6 text-sm text-muted">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          Secure Upload
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
          AI Analysis
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Instant Summaries
        </div>
      </div>
    </div>
  );
}
