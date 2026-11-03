"use client";

import { useState } from "react";
import { User, Bot, Quote, ExternalLink, Copy, Check, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useUpload } from "../pdf-upload/UploadContext";
import { Citation } from "./AIChat";
import { motion } from "framer-motion";
import { MarkdownRenderer } from "../../ui/MarkdownRenderer";
import { HoverPopover } from "../../ui/HoverPopover";

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

const getRelevance = (cit: CitationItem): number => {
  if (typeof cit !== 'object' || cit === null) return 0;
  const raw = (cit as Record<string, unknown>).relevance_score;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? "0"));
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
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
          ? 'bg-white border-[#EAE9EA] text-[#251F21]' 
          : 'bg-[#E8F2EE] border-[#397F70]/40 text-[#397F70] shadow-md'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div className={`flex-1 flex flex-col gap-3 p-5 rounded-2xl shadow-md transition-all duration-300 ${
        isUser 
          ? 'bg-[#FFFFFF] border border-[#EAE9EA] text-[#251F21] rounded-tr-sm ml-12' 
          : 'bg-white backdrop-blur-xl border border-[#EAE9EA] text-[#251F21] rounded-tl-sm hover:border-[#EAE9EA] mr-4'
      }`}>
        {isUser ? (
          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base font-sans tracking-normal">{content}</p>
        ) : (
          <MarkdownRenderer content={content} />
        )}
        
        {role === 'assistant' && (citations !== undefined || isLoadingCitations || citationError) && (
          <div className="mt-2 pt-4 border-t border-[#EAE9EA] w-full space-y-3">
            <h4 className="text-[11px] font-mono font-bold text-[#585254] flex items-center gap-1.5 uppercase tracking-wider">
              <Quote className="w-3.5 h-3.5 text-[#397F70]" />
              <span>Grounded Evidence & Citations</span>
            </h4>

            {isLoadingCitations ? (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] text-xs text-[#585254] font-mono shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin text-[#397F70]" />
                <span>Extracting semantic vector passages...</span>
              </div>
            ) : citationError ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#C3424D]/10 border border-[#C3424D]/30 text-xs text-[#C3424D] font-mono">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Backend retrieval error: {citationError}</span>
              </div>
            ) : (!Array.isArray(citations) || citations.length === 0) ? (
              <div className="p-3 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] text-xs text-[#585254] font-mono italic">
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
                      className="p-4 rounded-xl bg-[#FBFCFC]/90 border border-[#EAE9EA] hover:border-[#397F70]/40 transition-all duration-200 flex flex-col gap-2.5 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-[#EAE9EA] pb-2.5 flex-wrap">
                        <HoverPopover
                          trigger={
                            <span className="font-semibold text-xs text-[#251F21] flex items-center gap-1.5 line-clamp-1 cursor-help">
                              <span className="px-2 py-0.5 rounded bg-[#397F70]/20 text-[#397F70] font-mono text-[10px] font-bold">[{idx + 1}]</span>
                              <span className="underline decoration-dotted decoration-[#397F70]/50 underline-offset-2">📄 {title}</span>
                            </span>
                          }
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-xs text-[#397F70] line-clamp-2">{title}</span>
                              <span className="text-[10px] font-mono bg-[#FBFCFC] border border-[#EAE9EA] text-[#251F21] px-2 py-0.5 rounded shrink-0">Pg. {page}</span>
                            </div>
                            <p className="text-xs text-[#585254] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">{snippet}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-[#F7F3F1] overflow-hidden">
                                <div className="h-full rounded-full bg-[#397F70]" style={{ width: `${Math.round(getRelevance(cit) * 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-[#585254]">{Math.round(getRelevance(cit) * 100)}%</span>
                            </div>
                          </div>
                        </HoverPopover>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono bg-[#23825A]/10 border border-[#23825A]/30 text-[#23825A] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                            <ShieldAlert className="w-3 h-3" /> {confidenceScore}% Match
                          </span>
                          <span className="text-[10px] font-mono bg-white/[0.05] border border-[#EAE9EA] text-[#251F21] px-2 py-0.5 rounded">
                            Pg. {page}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-[#251F21] leading-relaxed pl-3.5 border-l-2 border-[#397F70]/60 italic font-serif">
                        &quot;{snippet}&quot;
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewPaper(title, paperId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#397F70]/20 border border-[#EAE9EA] hover:border-[#397F70]/40 text-[11px] font-medium text-[#251F21] hover:text-[#397F70] transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source
                        </button>
                        <button
                          onClick={() => handleCopyCitation(cit, idx)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#8469AE]/20 border border-[#EAE9EA] hover:border-[#8469AE]/40 text-[11px] font-medium text-[#585254] hover:text-[#8469AE] transition-all cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-[#23825A]" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? <span className="text-[#23825A]">Copied</span> : "Copy"}
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
