import { Navbar } from "./Navbar";
import { LeftSidebar } from "./LeftSidebar";
import { MainContent } from "./MainContent";
import { RightAnalysisPanel } from "./RightAnalysisPanel";

export function WorkspaceLayout() {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MainContent />
        <RightAnalysisPanel />
      </div>
    </div>
  );
}
