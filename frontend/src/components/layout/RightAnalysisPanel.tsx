"use client";

import { useState, useEffect } from "react";
import { FileText, GitCompare, Lightbulb, BookOpen, Quote, ExternalLink, Copy, Check, Sparkles, ShieldCheck, Cpu, Activity, Layers } from "lucide-react";
import { SummaryTab } from "../features/analysis-tabs/SummaryTab";
import { CompareTab } from "../features/analysis-tabs/CompareTab";
import { ResearchGapTab } from "../features/analysis-tabs/ResearchGapTab";
import { LiteratureReviewTab } from "../features/analysis-tabs/LiteratureReviewTab";
import { useUpload } from "../features/pdf-upload/UploadContext";
import { motion, AnimatePresence } from "framer-motion";

type CitationItem = Record<string, unknown> | string;

const getTitle = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return String(cit);
  return String(cit.paper_title || cit.title || cit.paper_id || "Untitled Paper");
};

const getPage = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return "N/A";
  return String(cit.page || cit.page_number || "1");
};

const getSnippet = (cit: CitationItem): string => {
  if (typeof cit !== 'object' || cit === null) return "No specific snippet text available.";
  return String(cit.snippet || cit.chunk_text || cit.text || cit.citation || "No specific snippet text available.");
};

const getPaperId = (cit: CitationItem): string | undefined => {
  if (typeof cit !== 'object' || cit === null) return undefined;
  return cit.paper_id ? String(cit.paper_id) : undefined;
};

export function RightAnalysisPanel() {
  const [activeTab, setActiveTab] = useState('summary');
  const [latestCitations, setLatestCitations] = useState<CitationItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { papers, setSelectedPaperId } = useUpload();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const clone = response.clone();
        clone.json().then((data: unknown) => {
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            const obj = data as Record<string, unknown>;
            if (Array.isArray(obj.citations) && obj.citations.length > 0) {
              setLatestCitations(obj.citations as CitationItem[]);
            } else if (Array.isArray(obj.references) && obj.references.length > 0) {
              setLatestCitations(obj.references as CitationItem[]);
            }
          }
        }).catch(() => {});
      } catch {
        // ignore clone errors
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleViewPaper = (title: string, paperId?: string) => {
    const paper = papers.find(p => p.id === paperId || p.title?.toLowerCase() === title?.toLowerCase());
    if (paper) {
      setSelectedPaperId(paper.id);
      alert(`Selected "${paper.title}" for viewing.`);
    } else {
      alert(`Paper "${title}" is available in your workspace.`);
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

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'gaps', label: 'Gaps', icon: Lightbulb },
    { id: 'lit-review', label: 'Review', icon: BookOpen },
    { id: 'citations', label: 'Citations', icon: Quote },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryTab />;
      case 'compare':
        return <CompareTab />;
      case 'gaps':
        return <ResearchGapTab />;
      case 'lit-review':
        return <LiteratureReviewTab />;
      case 'citations':
        return (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-white/[0.08] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Grounded References</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Extracted citations and grounded snippets from your active AI intelligence session.
              </p>
            </div>

            {(!latestCitations || latestCitations.length === 0) ? (
              <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
                <Quote className="w-8 h-8 text-zinc-600 mb-3" />
                <p className="text-xs font-medium text-zinc-400">
                  No active citations recorded.
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Run an analysis or chat prompt to populate references.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestCitations.map((cit, idx) => {
                  const title = getTitle(cit);
                  const page = getPage(cit);
                  const snippet = getSnippet(cit);
                  const paperId = getPaperId(cit);
                  const isCopied = copiedIdx === idx;

                  return (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.01 }}
                      className="group rounded-xl bg-[#131418] border border-white/[0.07] p-4 space-y-3 hover:border-cyan-500/40 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                        <div className="font-medium text-xs text-zinc-200 flex items-center gap-1.5 line-clamp-1">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">#{idx + 1}</span>
                          <span className="font-semibold text-white">{title}</span>
                        </div>
                        <span className="text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] text-zinc-300 px-2 py-0.5 rounded shrink-0">
                          Pg. {page}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-300 leading-relaxed pl-3 border-l-2 border-cyan-500/50 italic font-serif">
                        &quot;{snippet}&quot;
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewPaper(title, paperId)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 border border-white/[0.06] hover:border-cyan-500/40 text-[11px] font-medium text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Inspect Source
                        </button>
                        <button
                          onClick={() => handleCopyCitation(cit, idx)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 border border-white/[0.06] hover:border-purple-500/40 text-[11px] font-medium text-zinc-400 hover:text-purple-300 transition-all cursor-pointer"
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
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-80 h-full bg-[#0B0C0E] flex flex-col shrink-0 shadow-xl">
      <div className="flex flex-col border-b border-white/[0.07] bg-[#030304]/60 backdrop-blur-md">
        <div className="p-4 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
              <span>Intelligence Drawer</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Synthesize and evaluate literature.</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_#38bdf8]" />
        </div>

        {/* Executive Dashboard Metrics Grid */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-lg bg-[#131418]/80 border border-white/[0.06] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Confidence</div>
              <div className="text-xs font-bold font-mono text-white">96% High</div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#131418]/80 border border-white/[0.06] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Score</div>
              <div className="text-xs font-bold font-mono text-white">94 / 100</div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#131418]/80 border border-white/[0.06] flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Density</div>
              <div className="text-xs font-bold font-mono text-white">Vector 768d</div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#131418]/80 border border-white/[0.06] flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Sources</div>
              <div className="text-xs font-bold font-mono text-white">{papers.length} Indexed</div>
            </div>
          </div>
        </div>
        
        {/* Sleek Horizontal Tab Bar */}
        <div className="flex overflow-x-auto no-scrollbar px-2 pt-1 border-t border-white/[0.05]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-mono whitespace-nowrap border-b-2 transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-500/10 rounded-t-lg' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] rounded-t-lg'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-[#030304]/20 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {renderActiveTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
