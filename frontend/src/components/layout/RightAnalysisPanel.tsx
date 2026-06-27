"use client";

import { useState, useEffect } from "react";
import { FileText, GitCompare, Lightbulb, BookOpen, Quote, ExternalLink, Copy, Check } from "lucide-react";
import { SummaryTab } from "../features/analysis-tabs/SummaryTab";
import { CompareTab } from "../features/analysis-tabs/CompareTab";
import { ResearchGapTab } from "../features/analysis-tabs/ResearchGapTab";
import { LiteratureReviewTab } from "../features/analysis-tabs/LiteratureReviewTab";
import { useUpload } from "../features/pdf-upload/UploadContext";

const getTitle = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return String(cit);
  return cit.paper_title || cit.title || cit.paper_id || "Untitled Paper";
};

const getPage = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return "N/A";
  return cit.page || cit.page_number || "1";
};

const getSnippet = (cit: any) => {
  if (typeof cit !== 'object' || cit === null) return "No specific snippet text available.";
  return cit.snippet || cit.chunk_text || cit.text || cit.citation || "No specific snippet text available.";
};

export function RightAnalysisPanel() {
  const [activeTab, setActiveTab] = useState('summary');
  const [latestCitations, setLatestCitations] = useState<any[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { papers, setSelectedPaperId } = useUpload();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && typeof data === 'object') {
            if (Array.isArray(data.citations) && data.citations.length > 0) {
              setLatestCitations(data.citations);
            } else if (Array.isArray(data.references) && data.references.length > 0) {
              setLatestCitations(data.references);
            }
          }
        }).catch(() => {});
      } catch (e) {
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

  const handleCopyCitation = (cit: any, idx: number) => {
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
    { id: 'gaps', label: 'Research Gaps', icon: Lightbulb },
    { id: 'lit-review', label: 'Literature Review', icon: BookOpen },
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
            <div className="p-3 bg-surface-elevated rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Quote className="w-4 h-4 text-primary" />
                Latest AI Citations
              </h3>
              <p className="text-xs text-muted mt-1">
                Displaying grounded citations and sources from your most recent AI operation.
              </p>
            </div>

            {(!latestCitations || latestCitations.length === 0) ? (
              <div className="card h-60 flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
                <Quote className="w-10 h-10 text-muted mb-4 opacity-50" />
                <p className="text-sm font-medium text-muted">
                  No citations available. Generate an AI response first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestCitations.map((cit, idx) => {
                  const title = getTitle(cit);
                  const page = getPage(cit);
                  const snippet = getSnippet(cit);
                  const isCopied = copiedIdx === idx;

                  return (
                    <div key={idx} className="card bg-surface-elevated border-border p-4 space-y-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="font-medium text-sm text-foreground flex items-center gap-1.5 line-clamp-1">
                          <span className="text-primary font-bold">[{idx + 1}]</span>
                          <span>📄 {title}</span>
                        </div>
                        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">
                          Page {page}
                        </span>
                      </div>

                      <div className="text-xs text-muted leading-relaxed pl-3 border-l-2 border-primary/40 italic">
                        &quot;{snippet}&quot;
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewPaper(title, cit?.paper_id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface hover:bg-primary/10 border border-border text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Paper
                        </button>
                        <button
                          onClick={() => handleCopyCitation(cit, idx)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface hover:bg-surface border border-border text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? "Copied" : "Copy Citation"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
            <FileText className="w-10 h-10 text-muted mb-4 opacity-50" />
            <h3 className="text-sm font-medium text-foreground mb-2">Coming Soon</h3>
            <p className="text-xs text-muted">
              This feature is still under development. Please check back later.
            </p>
          </div>
        );
    }
  };

  return (
    <aside className="w-80 border-l border-border bg-surface flex flex-col shrink-0">
      <div className="flex flex-col border-b border-border">
        <div className="p-4 border-b border-border bg-surface-elevated">
          <h2 className="font-semibold text-foreground">Analysis Tools</h2>
          <p className="text-xs text-muted mt-1">Select a view to analyze your papers.</p>
        </div>
        
        {/* Tabs Row */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-border px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  isActive 
                    ? 'border-primary text-primary shadow-[inset_0_-2px_4px_rgba(14,165,233,0.2)]' 
                    : 'border-transparent text-muted hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {renderActiveTab()}
      </div>
    </aside>
  );
}
