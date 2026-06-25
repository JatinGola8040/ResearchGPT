"use client";

import { useState } from "react";
import { WelcomeState } from "../features/upload-workspace/WelcomeState";
import { PaperDetails } from "../features/upload-workspace/PaperDetails";
import { FileText } from "lucide-react";

export function MainContent() {
  // Mock state: Toggle this to see different views
  const [hasPapers, setHasPapers] = useState(true);

  return (
    <main className="flex-1 flex flex-col bg-background relative h-full border-r border-border">
      {/* 
        For demonstration purposes, a small toggle button to switch mock states.
        This represents the interaction of selecting a paper vs having an empty workspace.
      */}
      <div className="absolute top-4 right-4 z-10">
         <button 
           onClick={() => setHasPapers(!hasPapers)}
           className="btn btn-sm btn-outline text-xs flex items-center gap-2 bg-surface"
         >
           <FileText className="w-3 h-3" />
           Toggle Mock State (Has Papers: {hasPapers ? 'Yes' : 'No'})
         </button>
      </div>

      {hasPapers ? <PaperDetails /> : <WelcomeState />}
    </main>
  );
}
