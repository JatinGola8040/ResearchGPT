import { FileText, MoreVertical, CheckCircle2, Loader2 } from "lucide-react";

const mockPapers = [
  { id: '1', title: 'Attention Is All You Need.pdf', size: '2.4 MB', status: 'ready' },
  { id: '2', title: 'Deep Residual Learning for Image Recognition.pdf', size: '1.8 MB', status: 'ready' },
  { id: '3', title: 'Generative Adversarial Networks.pdf', size: '3.1 MB', status: 'processing' },
];

export function UploadedPapersList() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Uploaded Papers ({mockPapers.length})
        </h3>
      </div>
      
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {mockPapers.map((paper) => (
          <div 
            key={paper.id}
            className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border hover:border-primary/50 hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-3 overflow-hidden">
              <div className={`mt-0.5 p-1.5 rounded-md ${paper.status === 'ready' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm text-foreground truncate font-medium group-hover:text-primary transition-colors">{paper.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted">{paper.size}</span>
                  <span className="text-[10px] text-muted">•</span>
                  {paper.status === 'ready' ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-[11px] text-secondary flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-surface text-muted hover:text-foreground transition-all">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
