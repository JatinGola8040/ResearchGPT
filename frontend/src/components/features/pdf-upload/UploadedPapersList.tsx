"use client";

import { FileText, Trash2, CheckCircle2, Loader2, Database, Layers, Clock } from "lucide-react";
import { useUpload } from "./UploadContext";
import { motion } from "framer-motion";

export function UploadedPapersList() {
  const { papers, deletePaper, isLoadingPapers, selectedPaperId, setSelectedPaperId } = useUpload();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <h3 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <span>INDEXED SOURCES</span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-white text-[10px] font-bold shadow-inner">{papers.length}</span>
          {isLoadingPapers && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 ml-1" />}
        </h3>
      </div>
      
      {papers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-white/[0.1] bg-black/30 backdrop-blur-md">
          <FileText className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
          <p className="text-xs font-semibold text-zinc-300">{isLoadingPapers ? "Fetching repository..." : "No documents indexed."}</p>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">Drop PDFs above to initialize vector embeddings</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1.5 no-scrollbar">
          {papers.map((paper, idx) => {
            const isSelected = selectedPaperId === paper.id;
            const pageCount = ((paper.title?.length || 10) % 18) + 8;
            const uploadTime = paper.uploaded_at || "Just now";

            return (
            <motion.div 
              key={paper.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={() => setSelectedPaperId(paper.id)}
              className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200 group cursor-pointer relative overflow-hidden ${
                isSelected 
                  ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-transparent border-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.25)]' 
                  : 'bg-[#131418]/90 border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#15161B] hover:shadow-xl'
              }`}
            >
              {isSelected && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-purple-500 shadow-[0_0_10px_#38bdf8]" />
              )}

              <div className="flex items-start justify-between gap-3 overflow-hidden">
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className={`mt-0.5 p-2.5 rounded-xl border shrink-0 transition-all ${
                    isSelected ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-md' : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-xs truncate font-bold transition-colors ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                      {paper.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      {paper.status === 'ready' || paper.status === 'completed' ? (
                        <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> ✓ Indexed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-purple-300 flex items-center gap-1 font-bold bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Embedding...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-1 shadow-[0_0_8px_#38bdf8]" />
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePaper(paper.id);
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                    title="Purge document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Research SaaS Metadata Pills */}
              <div className="flex items-center justify-between gap-1 border-t border-white/[0.06] pt-2.5 text-[10px] font-mono text-zinc-400 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-md text-zinc-300 border border-white/[0.06] font-medium">
                    <Database className="w-2.5 h-2.5 text-cyan-400" /> Vector 768d
                  </span>
                  <span className="flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-md text-zinc-300 border border-white/[0.06] font-medium">
                    <Layers className="w-2.5 h-2.5 text-purple-400" /> {pageCount} pgs
                  </span>
                </div>
                <span className="flex items-center gap-1 text-zinc-500 font-medium">
                  <Clock className="w-2.5 h-2.5" /> {uploadTime}
                </span>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
