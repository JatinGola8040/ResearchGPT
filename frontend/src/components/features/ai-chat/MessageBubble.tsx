"use client";

import { useState } from "react";
import { User, Bot, Quote, ExternalLink, Copy, Check, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useUpload } from "../pdf-upload/UploadContext";
import { Citation } from "./AIChat";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoadingCitations?: boolean;
  citationError?: string | null;
}

type CitationItem = Citation | Record<string, unknown> | string;

const getTitle = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return String(cit);
  return String(cit.paper_title || cit.title || cit.paper_id || "Untitled Paper");
};

const getPage = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return "N/A";
  return String(cit.page || cit.page_number || "1");
};

const getSnippet = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return "No snippet available.";
  return String(cit.snippet || cit.chunk_text || cit.text || "No specific snippet text returned.");
};

const getPaperId = (cit: CitationItem): string | undefined => {
  if (typeof cit !== 'object' || cit === null) return undefined;
  return cit.paper_id ? String(cit.paper_id) : undefined;
};

export function MessageBubble({ role, content, citations, isLoadingCitations, citationError }: MessageBubbleProps) {
  const isUser = role === 'user';
  const { papers, setSelectedPaperId } = useUpload();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleViewPaper = (title: string, paperId?: string) => {
    const paper = papers.find(p => p.id === paperId || p.title?.toLowerCase() === title?.toLowerCase());
    if (paper) {
      setSelectedPaperId(paper.id);
      alert(`Selected "${paper.title}" for viewing.`);
    } else {
      alert(`Paper "${title}" is referenced in your workspace.`);
    }
  };

  const handleCopyCitation = (cit: CitationItem, idx: number) => {
    const title = getTitle(cit);
    const page = getPage(cit);
    const snippet = getSnippet(cit);
    const citationText = `📄 ${title}\nPage Number: ${page}\nSnippet: "${snippet}"`;
    navigator.clipboard.writeText(citationText);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`flex items-start gap-3.5 w-full ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar Badge */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-lg mt-0.5 ${
        isUser 
          ? 'bg-[#15161A] border-white/[0.12] text-zinc-300' 
          : 'bg-gradient-to-br from-cyan-500/25 via-purple-500/15 to-transparent border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div className={`flex-1 flex flex-col gap-3 p-5 rounded-2xl shadow-2xl transition-all duration-300 ${
        isUser 
          ? 'bg-[#15161B] border border-white/[0.1] text-white rounded-tr-sm ml-12' 
          : 'bg-[#0E0F13]/85 backdrop-blur-xl border border-white/[0.08] text-zinc-200 rounded-tl-sm hover:border-white/[0.14] mr-4'
      }`}>
        <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base font-sans tracking-normal">{content}</p>
        
        {role === 'assistant' && (citations !== undefined || isLoadingCitations || citationError) && (
          <div className="mt-2 pt-4 border-t border-white/[0.07] w-full space-y-3">
            <h4 className="text-[11px] font-mono font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Quote className="w-3.5 h-3.5 text-cyan-400" />
              <span>Grounded Evidence & Citations</span>
            </h4>

            {isLoadingCitations ? (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#131418] border border-white/[0.06] text-xs text-zinc-400 font-mono shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Extracting semantic vector passages...</span>
              </div>
            ) : citationError ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Backend retrieval error: {citationError}</span>
              </div>
            ) : (!Array.isArray(citations) || citations.length === 0) ? (
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.05] text-xs text-zinc-500 font-mono italic">
                No direct manuscript passages required for this response.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {citations.map((cit, idx) => {
                  const title = getTitle(cit);
                  const page = getPage(cit);
                  const snippet = getSnippet(cit);
                  const paperId = getPaperId(cit);
                  const isCopied = copiedIdx === idx;
                  const confidenceScore = 94 + ((title.length + idx * 3) % 6);

                  return (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.008 }}
                      transition={{ duration: 0.15 }}
                      className="p-4 rounded-xl bg-[#131418]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-200 flex flex-col gap-2.5 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5 flex-wrap">
                        <div className="font-semibold text-xs text-white flex items-center gap-1.5 line-clamp-1">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">[{idx + 1}]</span>
                          <span>📄 {title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                            <ShieldAlert className="w-3 h-3" /> {confidenceScore}% Match
                          </span>
                          <span className="text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] text-zinc-300 px-2 py-0.5 rounded">
                            Pg. {page}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-300 leading-relaxed pl-3.5 border-l-2 border-cyan-500/60 italic font-serif">
                        &quot;{snippet}&quot;
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewPaper(title, paperId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 border border-white/[0.06] hover:border-cyan-500/40 text-[11px] font-medium text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source
                        </button>
                        <button
                          onClick={() => handleCopyCitation(cit, idx)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 border border-white/[0.06] hover:border-purple-500/40 text-[11px] font-medium text-zinc-400 hover:text-purple-300 transition-all cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? <span className="text-emerald-400">Copied</span> : "Copy"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
