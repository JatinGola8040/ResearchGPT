import { FileUp } from "lucide-react";

export function DragDropArea() {
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-surface-elevated hover:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all group">
      <div className="p-3 bg-surface-elevated rounded-full mb-3 group-hover:bg-primary/20 transition-colors">
        <FileUp className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
      </div>
      <p className="text-sm font-medium text-foreground">Drag & drop PDFs here</p>
      <p className="text-xs text-muted mt-1">or click to browse files</p>
    </div>
  );
}
