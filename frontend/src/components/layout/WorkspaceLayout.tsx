import { Navbar } from "./Navbar";
import { LeftSidebar } from "./LeftSidebar";
import { MainContent } from "./MainContent";
import { RightAnalysisPanel } from "./RightAnalysisPanel";
import { UploadProvider } from "../features/pdf-upload/UploadContext";

export function WorkspaceLayout() {
  return (
    <UploadProvider>
      <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <MainContent />
          <RightAnalysisPanel />
        </div>
      </div>
    </UploadProvider>
  );
}
