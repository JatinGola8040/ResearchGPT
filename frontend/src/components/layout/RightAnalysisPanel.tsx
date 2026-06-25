import { FileText, GitCompare, Lightbulb, BookOpen, Quote } from "lucide-react";

export function RightAnalysisPanel() {
  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'gaps', label: 'Research Gaps', icon: Lightbulb },
    { id: 'lit-review', label: 'Literature Review', icon: BookOpen },
    { id: 'citations', label: 'Citations', icon: Quote },
  ];

  return (
    <aside className="w-80 border-l border-border bg-surface flex flex-col shrink-0">
      <div className="flex flex-col border-b border-border">
        <div className="p-4 border-b border-border bg-surface-elevated">
          <h2 className="font-semibold text-foreground">Analysis Tools</h2>
          <p className="text-xs text-muted mt-1">Select a view to analyze your papers.</p>
        </div>
        
        {/* Tabs Row */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-border px-2">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                idx === 0 
                  ? 'border-primary text-primary shadow-[inset_0_-2px_4px_rgba(14,165,233,0.2)]' 
                  : 'border-transparent text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Placeholder Content for the Active Tab */}
        <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
          <FileText className="w-10 h-10 text-muted mb-4 opacity-50" />
          <h3 className="text-sm font-medium text-foreground mb-2">Summary View</h3>
          <p className="text-xs text-muted">
            Ask the AI to summarize a paper or select one from the list to see auto-generated insights here.
          </p>
        </div>
      </div>
    </aside>
  );
}
