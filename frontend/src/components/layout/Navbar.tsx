import { Sparkles, Settings, User } from "lucide-react";

export function Navbar() {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-semibold text-lg tracking-tight">ResearchGPT</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost p-2 rounded-full">
          <Settings className="w-5 h-5" />
        </button>
        <button className="btn btn-ghost p-2 rounded-full">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
