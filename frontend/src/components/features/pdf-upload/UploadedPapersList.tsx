import { FileText, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useUpload } from "./UploadContext";

export function UploadedPapersList() {
  const { papers, deletePaper, isLoadingPapers } = useUpload();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          Uploaded Papers ({papers.length})
          {isLoadingPapers && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </h3>
      </div>
      
      {papers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <FileText className="w-8 h-8 text-muted mb-2 opacity-50" />
          <p className="text-sm text-muted">{isLoadingPapers ? "Loading papers..." : "No papers uploaded yet."}</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {papers.map((paper) => (
            <div 
              key={paper.id}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border hover:border-primary/50 hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <div className={`mt-0.5 p-1.5 rounded-md ${paper.status === 'ready' || paper.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-foreground truncate font-medium group-hover:text-primary transition-colors">{paper.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    {paper.uploaded_at && (
                      <>
                        <span className="text-[11px] text-muted">{paper.uploaded_at}</span>
                        <span className="text-[10px] text-muted">•</span>
                      </>
                    )}
                    {paper.status === 'ready' || paper.status === 'completed' ? (
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
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deletePaper(paper.id);
                }}
                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted hover:text-red-400 transition-all"
                title="Delete paper"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
