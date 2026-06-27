"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, BookOpen, ChevronDown, ChevronUp, Copy, Check, Download } from "lucide-react";

interface LiteratureReviewData {
  title?: string;
  introduction?: string | string[];
  research_objectives?: string | string[];
  related_work?: string | string[];
  methodology_comparison?: string | string[];
  datasets_used?: string | string[];
  key_findings?: string | string[];
  research_trends?: string | string[];
  research_gaps?: string | string[];
  future_scope?: string | string[];
  conclusion?: string | string[];
  references?: any[];
  [key: string]: any;
}

export function LiteratureReviewTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewData, setReviewData] = useState<LiteratureReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  
  // Track collapsible states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    title: true,
    introduction: true,
    objectives: true,
    related: true,
    methodology: true,
    datasets: true,
    findings: true,
    trends: true,
    gaps: true,
    scope: true,
    conclusion: true,
    references: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        if (prev.length >= 10) return prev; // max 10 enforcement
        return [...prev, id];
      }
    });
  };

  const handleGenerate = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 10) return;
    
    setIsLoading(true);
    setError(null);
    setReviewData(null);
    setExportMessage(null);
    
    try {
      const data = await api.generateLiteratureReview(selectedIds);
      const res = data.literature_review || data.review || data.literatureReview || data;
      setReviewData({
        title: res.title || res.review_title || res.reviewTitle || "Synthesized Literature Review",
        introduction: res.introduction || res.intro,
        research_objectives: res.research_objectives || res.researchObjectives || res.objectives,
        related_work: res.related_work || res.relatedWork || res.background,
        methodology_comparison: res.methodology_comparison || res.methodologyComparison || res.methodology,
        datasets_used: res.datasets_used || res.datasetsUsed || res.datasets,
        key_findings: res.key_findings || res.keyFindings || res.findings,
        research_trends: res.research_trends || res.researchTrends || res.trends,
        research_gaps: res.research_gaps || res.researchGaps || res.gaps,
        future_scope: res.future_scope || res.futureScope || res.scope,
        conclusion: res.conclusion,
        references: res.references || res.citations || res.bibliography,
      });
    } catch (err) {
      console.error("Failed to generate literature review:", err);
      setError("Failed to generate literature review. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!reviewData) return;
    const sections = [
      { label: "Title", key: "title" },
      { label: "Introduction", key: "introduction" },
      { label: "Research Objectives", key: "research_objectives" },
      { label: "Related Work", key: "related_work" },
      { label: "Methodology Comparison", key: "methodology_comparison" },
      { label: "Datasets Used", key: "datasets_used" },
      { label: "Key Findings", key: "key_findings" },
      { label: "Research Trends", key: "research_trends" },
      { label: "Research Gaps", key: "research_gaps" },
      { label: "Future Scope", key: "future_scope" },
      { label: "Conclusion", key: "conclusion" },
      { label: "References", key: "references" },
    ];
    
    const text = sections
      .map(s => {
        const val = reviewData[s.key];
        if (!val) return null;
        let formattedVal = val;
        if (Array.isArray(val)) {
          formattedVal = val.map(v => typeof v === 'object' && v !== null ? (v.paper_title ? `${v.paper_title}: ${v.citation || ''}` : JSON.stringify(v)) : `• ${v}`).join('\n');
        } else if (typeof val === 'object' && val !== null) {
          formattedVal = JSON.stringify(val);
        }
        return `# ${s.label}\n\n${formattedVal}`;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    setExportMessage("Export feature coming soon.");
    setTimeout(() => setExportMessage(null), 3000);
  };

  const ExpandableCard = ({ title, contentKey, content }: { title: string, contentKey: string, content?: any }) => {
    const isExpanded = expandedSections[contentKey];
    const hasContent = content && (!Array.isArray(content) || content.length > 0);
    const displayContent = hasContent ? content : "No specific details identified.";
    
    const renderContent = () => {
      if (contentKey === "references" || (Array.isArray(displayContent) && displayContent.length > 0 && typeof displayContent[0] === 'object' && displayContent[0] !== null)) {
        if (!Array.isArray(displayContent)) {
          const text = typeof displayContent === 'object' && displayContent !== null ? JSON.stringify(displayContent) : String(displayContent);
          return <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{text}</p>;
        }
        return (
          <div className="space-y-2.5">
            {displayContent.map((ref: any, idx: number) => {
              if (typeof ref !== 'object' || ref === null) {
                return (
                  <div key={idx} className="p-3 rounded-lg bg-surface border border-border text-sm text-muted">
                    {String(ref)}
                  </div>
                );
              }
              return (
                <div key={idx} className="p-3 rounded-lg bg-surface border border-border space-y-1">
                  <div className="font-medium text-sm text-foreground flex items-center gap-2">
                    <span>📄</span>
                    <span>{ref.paper_title || ref.title || "Untitled Paper"}</span>
                  </div>
                  {ref.citation && (
                    <div className="text-xs text-muted font-mono leading-relaxed pl-6">
                      {ref.citation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      if (Array.isArray(displayContent)) {
        return (
          <ul className="space-y-1.5">
            {displayContent.map((item: any, idx: number) => {
              const text = typeof item === 'object' && item !== null ? (item.paper_title ? `${item.paper_title}: ${item.citation || ''}` : JSON.stringify(item)) : String(item);
              return (
                <li key={idx} className="text-sm text-muted leading-relaxed flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      const text = typeof displayContent === 'object' && displayContent !== null ? JSON.stringify(displayContent, null, 2) : String(displayContent);
      return <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{text}</p>;
    };

    return (
      <div className="card bg-surface-elevated border-border overflow-hidden">
        <button 
          onClick={() => toggleSection(contentKey)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-surface transition-colors"
        >
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
        {isExpanded && (
          <div className="p-4 pt-3 border-t border-border/50">
            {renderContent()}
          </div>
        )}
      </div>
    );
  };

  // Early return if not enough papers are uploaded
  if (papers.length < 2) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
        <BookOpen className="w-10 h-10 text-muted mb-4 opacity-50" />
        <h3 className="text-sm font-medium text-foreground mb-2">Literature Review View</h3>
        <p className="text-xs text-muted">
          Upload at least 2 papers to generate a comprehensive literature review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Paper Selection UI */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Select Papers (2-10)
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
          {papers.map(paper => (
            <label 
              key={paper.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.includes(paper.id) 
                  ? 'bg-primary/5 border-primary/50' 
                  : 'bg-surface border-border hover:border-primary/30'
              }`}
            >
              <input 
                type="checkbox" 
                className="mt-0.5 accent-primary"
                checked={selectedIds.includes(paper.id)}
                onChange={() => handleCheckboxChange(paper.id)}
                disabled={!selectedIds.includes(paper.id) && selectedIds.length >= 10}
              />
              <span className="text-sm text-foreground line-clamp-2 leading-tight">{paper.title}</span>
            </label>
          ))}
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={selectedIds.length < 2 || selectedIds.length > 10 || isLoading}
          className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Review...</>
          ) : (
            <><BookOpen className="w-4 h-4" /> Generate Literature Review</>
          )}
        </button>
      </div>

      {/* Loading & Error States */}
      {error && (
        <div className="flex flex-col items-center justify-center space-y-3 p-4 text-center border border-red-500/20 bg-red-500/5 rounded-lg">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!reviewData && !isLoading && !error && (
        <div className="card flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent mt-4">
          <BookOpen className="w-8 h-8 text-muted mb-3 opacity-30" />
          <p className="text-xs text-muted">
            Select 2 to 10 papers and click generate to synthesize literature review.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {reviewData && !isLoading && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 px-3 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-xs font-medium text-foreground flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          
          <button
            onClick={handleExport}
            className="flex-1 py-2 px-3 bg-surface-elevated hover:bg-surface border border-border rounded-lg text-xs font-medium text-foreground flex items-center justify-center gap-1.5 transition-colors relative"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            Export
          </button>
        </div>
      )}

      {exportMessage && (
        <div className="p-2 text-center text-xs text-primary bg-primary/10 border border-primary/20 rounded-md">
          {exportMessage}
        </div>
      )}

      {/* Results UI with Collapsible Cards */}
      {reviewData && !isLoading && (
        <div className="space-y-3 mt-2">
          <ExpandableCard title="Title" contentKey="title" content={reviewData.title} />
          <ExpandableCard title="Introduction" contentKey="introduction" content={reviewData.introduction} />
          <ExpandableCard title="Research Objectives" contentKey="objectives" content={reviewData.research_objectives} />
          <ExpandableCard title="Related Work" contentKey="related" content={reviewData.related_work} />
          <ExpandableCard title="Methodology Comparison" contentKey="methodology" content={reviewData.methodology_comparison} />
          <ExpandableCard title="Datasets Used" contentKey="datasets" content={reviewData.datasets_used} />
          <ExpandableCard title="Key Findings" contentKey="findings" content={reviewData.key_findings} />
          <ExpandableCard title="Research Trends" contentKey="trends" content={reviewData.research_trends} />
          <ExpandableCard title="Research Gaps" contentKey="gaps" content={reviewData.research_gaps} />
          <ExpandableCard title="Future Scope" contentKey="scope" content={reviewData.future_scope} />
          <ExpandableCard title="Conclusion" contentKey="conclusion" content={reviewData.conclusion} />
          <ExpandableCard title="References" contentKey="references" content={reviewData.references} />
        </div>
      )}
    </div>
  );
}
