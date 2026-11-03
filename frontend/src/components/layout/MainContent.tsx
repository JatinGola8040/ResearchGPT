"use client";

import { useState } from "react";
import { WelcomeState } from "../features/upload-workspace/WelcomeState";
import { PaperDetails } from "../features/upload-workspace/PaperDetails";
import { AIChat } from "../features/ai-chat/AIChat";
import { IdeaValidatorTab } from "../features/analysis-tabs/IdeaValidatorTab";
import { ContradictionMapView } from "../features/contradiction-map/ContradictionMapView";
import { EvidenceCourtView } from "../features/evidence-court/EvidenceCourtView";
import { PaperGalaxyView } from "../features/paper-galaxy/PaperGalaxyView";
import { useUpload } from "../features/pdf-upload/UploadContext";
import { FileText, MessageSquare, Sparkles, FlaskConical, Waypoints, Scale, Orbit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ViewState = 'welcome' | 'document' | 'chat' | 'ideas' | 'map' | 'court' | 'galaxy';

export function MainContent() {
  const [viewState, setViewState] = useState<ViewState>('chat');
  const { setSelectedPaperId } = useUpload();

  const openInInspector = (paperId: string) => {
    setSelectedPaperId(paperId);
    setViewState('document');
  };

  const capsuleBtn = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
      active
        ? 'bg-[#E8F2EE] text-[#397F70] border border-[#397F70]/30 font-semibold'
        : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
    }`;

  return (
    <main className="flex-1 flex flex-col bg-[#F4EFEC] relative h-full border-r border-[#EAE9EA] overflow-hidden">

      {/* Centered Floating Command Capsule */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center p-1 gap-1 rounded-full bg-white border border-[#EAE9EA] shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)]">
         <button 
           onClick={() => setViewState('welcome')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'welcome' 
               ? 'bg-[#E8F2EE] text-[#397F70] border border-[#397F70]/30 font-semibold' 
               : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
           }`}
         >
           <Sparkles className={`w-3.5 h-3.5 ${viewState === 'welcome' ? 'text-[#397F70]' : ''}`} />
           Overview
         </button>
         <button 
           onClick={() => setViewState('document')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'document' 
               ? 'bg-[#E8F2EE] text-[#397F70] border border-[#397F70]/30 font-semibold' 
               : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
           }`}
         >
           <FileText className={`w-3.5 h-3.5 ${viewState === 'document' ? 'text-[#397F70]' : ''}`} />
           Inspector
         </button>
         <button 
           onClick={() => setViewState('chat')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'chat' 
               ? 'bg-[#E8F2EE] text-[#397F70] border border-[#397F70]/30 font-semibold' 
               : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
           }`}
         >
           <MessageSquare className={`w-3.5 h-3.5 ${viewState === 'chat' ? 'text-[#397F70]' : ''}`} />
           Studio Chat
         </button>
         <button 
           onClick={() => setViewState('ideas')}
           className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
             viewState === 'ideas' 
               ? 'bg-[#E8F2EE] text-[#397F70] border border-[#397F70]/30 font-semibold' 
               : 'text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04]'
           }`}
         >
           <FlaskConical className={`w-3.5 h-3.5 ${viewState === 'ideas' ? 'text-[#397F70]' : ''}`} />
           Ideas
         </button>
         <button
           onClick={() => setViewState('map')}
           className={capsuleBtn(viewState === 'map')}
         >
           <Waypoints className={`w-3.5 h-3.5 ${viewState === 'map' ? 'text-[#397F70]' : ''}`} />
           Map
         </button>
         <button
           onClick={() => setViewState('court')}
           className={capsuleBtn(viewState === 'court')}
         >
           <Scale className={`w-3.5 h-3.5 ${viewState === 'court' ? 'text-[#397F70]' : ''}`} />
           Court
         </button>
         <button
           onClick={() => setViewState('galaxy')}
           className={capsuleBtn(viewState === 'galaxy')}
         >
           <Orbit className={`w-3.5 h-3.5 ${viewState === 'galaxy' ? 'text-[#397F70]' : ''}`} />
           Galaxy
         </button>
      </div>

      <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'welcome' ? 'flex' : 'hidden'}`}>
          <WelcomeState />
        </div>
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'document' ? 'flex' : 'hidden'}`}>
          <PaperDetails />
        </div>
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'chat' ? 'flex' : 'hidden'}`}>
          <AIChat />
        </div>
        <div className={`flex-1 overflow-y-auto px-6 pt-20 pb-10 custom-scrollbar max-w-4xl mx-auto w-full ${viewState === 'ideas' ? 'block' : 'hidden'}`}>
          <IdeaValidatorTab />
        </div>
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'map' ? 'flex' : 'hidden'}`}>
          <ContradictionMapView />
        </div>
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'court' ? 'flex' : 'hidden'}`}>
          <EvidenceCourtView />
        </div>
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewState === 'galaxy' ? 'flex' : 'hidden'}`}>
          <PaperGalaxyView onOpenInInspector={openInInspector} />
        </div>
      </div>
    </main>
  );
}
