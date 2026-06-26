import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useUpload } from "./UploadContext";

export function UploadProgress() {
  const { uploads, removeUpload } = useUpload();

  if (uploads.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 px-1">
        Transfers
      </h4>
      {uploads.map((item) => (
        <div key={item.id} className="p-3 bg-surface-elevated border border-border rounded-lg relative overflow-hidden group">
          {/* Progress bar background (subtle) */}
          {item.state === 'uploading' && (
            <div 
              className="absolute top-0 left-0 h-full bg-primary/5 transition-all duration-300 ease-out" 
              style={{ width: `${item.progress}%` }} 
            />
          )}
          
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {item.state === 'uploading' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {item.state === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {item.state === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.filename}</span>
                <button 
                  onClick={() => removeUpload(item.id)}
                  className="text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {item.state === 'uploading' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300" 
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-8 text-right font-medium">{item.progress}%</span>
                </div>
              )}
              
              {item.state === 'failed' && (
                <p className="text-xs text-red-400 mt-1">{item.errorMessage}</p>
              )}
              
              {item.state === 'completed' && (
                <p className="text-xs text-emerald-400 mt-1">Upload complete</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
