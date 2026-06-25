import { UploadButton } from "../features/pdf-upload/UploadButton";
import { DragDropArea } from "../features/pdf-upload/DragDropArea";
import { UploadProgress } from "../features/pdf-upload/UploadProgress";
import { UploadedPapersList } from "../features/pdf-upload/UploadedPapersList";

export function LeftSidebar() {
  return (
    <aside className="w-80 border-r border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col overflow-y-auto max-h-[60%]">
        <div className="space-y-4 shrink-0">
          <UploadButton />
          <DragDropArea />
        </div>
        <UploadProgress />
      </div>
      
      <div className="flex-1 overflow-hidden p-4">
        <UploadedPapersList />
      </div>
    </aside>
  );
}
