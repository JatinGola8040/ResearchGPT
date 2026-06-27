"use client";

import { useState } from "react";
import { User, Bot, Quote, ExternalLink, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { useUpload } from "../pdf-upload/UploadContext";
import { Citation } from "./AIChat";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoadingCitations?: boolean;
  citationError?: string | null;
}

const getTitle = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return String(cit);
  return cit.paper_title || cit.title || cit.paper_id || "Untitled Paper";
};

const getPage = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return "N/A";
  return cit.page || cit.page_number || "1";
};

const getSnippet = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return "No snippet available.";
  return cit.snippet || cit.chunk_text || cit.text || "No specific snippet text returned.";
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

  const handleCopyCitation = (cit: any, idx: number) => {
    const title = getTitle(cit);
    const page = getPage(cit);
    const snippet = getSnippet(cit);
    const citationText = `📄 ${title}\nPage Number: ${page}\nSnippet: "${snippet}"`;
    navigator.clipboard.writeText(citationText);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className={`flex items-start gap-4 w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-elevated' : 'bg-primary/20'}`}>
        {isUser ? <User className="w-5 h-5 text-muted" /> : <Bot className="w-5 h-5 text-primary" />}
      </div>
      <div className={`flex-1 flex flex-col gap-2 p-4 rounded-2xl ${isUser ? 'bg-surface-elevated rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'}`}>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {role === 'assistant' && (citations !== undefined || isLoadingCitations || citationError) && (
          <div className="mt-3 pt-3 border-t border-border/50 w-full">
            <h4 className="text-xs font-semibold text-muted mb-2.5 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-primary" />
              Sources & Citations
            </h4>

            {isLoadingCitations ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-elevated border border-border text-xs text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Retrieving grounded citations...</span>
              </div>
            ) : citationError ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>API Error retrieving citations: {citationError}</span>
              </div>
            ) : (!Array.isArray(citations) || citations.length === 0) ? (
              <div className="p-3 rounded-lg bg-surface-elevated/50 border border-border/40 text-xs text-muted italic">
                No specific citations or source passages found for this response.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {citations.map((cit, idx) => {
                  const title = getTitle(cit);
                  const page = getPage(cit);
                  const snippet = getSnippet(cit);
                  const isCopied = copiedIdx === idx;

                  return (
                    <div key={idx} className="p-3 rounded-lg bg-surface-elevated border border-border/60 hover:border-border transition-colors flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-xs text-foreground flex items-center gap-1.5 line-clamp-1">
                          <span className="text-primary font-bold">[{idx + 1}]</span>
                          <span>📄 {title}</span>
                        </div>
                        <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">
                          Page Number: {page}
                        </span>
                      </div>

                      <div className="text-xs text-muted leading-relaxed pl-3 border-l-2 border-primary/40 italic">
                        Snippet: &quot;{snippet}&quot;
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewPaper(title, cit?.paper_id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-primary/10 border border-border text-[11px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Paper
                        </button>
                        <button
                          onClick={() => handleCopyCitation(cit, idx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-surface border border-border text-[11px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? "Copied" : "Copy Citation"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
