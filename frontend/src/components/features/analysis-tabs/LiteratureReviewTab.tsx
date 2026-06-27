"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, BookOpen, ChevronDown, ChevronUp, Copy, Check, Download, Sparkles, CheckSquare, Square } from "lucide-react";

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
  references?: unknown[];
  [key: string]: unknown;
}

interface ExpandableReviewSectionProps {
  title: string;
  contentKey: string;
  content?: unknown;
  isExpanded: boolean;
  onToggle: (key: string) => void;
}

function ExpandableReviewSection({ title, contentKey, content, isExpanded, onToggle }: ExpandableReviewSectionProps) {
  const hasContent = content !== undefined && content !== null && (!Array.isArray(content) || content.length > 0);
  const displayContent = hasContent ? content : "No specific details identified.";
  
  const renderContent = () => {
    if (contentKey === "references" || (Array.isArray(displayContent) && displayContent.length > 0 && typeof displayContent[0] === 'object' && displayContent[0] !== null)) {
      if (!Array.isArray(displayContent)) {
        const text = typeof displayContent === 'object' && displayContent !== null ? JSON.stringify(displayContent) : String(displayContent);
        return <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{text}</p>;
      }
      return (
        <div className="space-y-2.5">
          {displayContent.map((ref: unknown, idx: number) => {
            if (typeof ref !== 'object' || ref === null) {
              return (
                <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-300 font-mono">
                  {String(ref)}
                </div>
              );
            }
            const refObj = ref as { paper_title?: string; title?: string; citation?: string };
            return (
              <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="font-semibold text-xs text-white flex items-center gap-2">
                  <span>📄</span>
                  <span>{String(refObj.paper_title || refObj.title || "Untitled Paper")}</span>
                </div>
                {Boolean(refObj.citation) && (
                  <div className="text-[11px] text-zinc-400 font-mono leading-relaxed pl-6 italic">
                    {String(refObj.citation)}
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
        <ul className="space-y-2">
          {displayContent.map((item: unknown, idx: number) => {
            const text = typeof item === 'object' && item !== null ? ((item as Record<string, unknown>).paper_title ? `${(item as Record<string, unknown>).paper_title}: ${(item as Record<string, unknown>).citation || ''}` : JSON.stringify(item)) : String(item);
            return (
              <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.03]">
                <span className="text-cyan-400 font-mono font-bold shrink-0">•</span>
                <span>{text}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    const text = typeof displayContent === 'object' && displayContent !== null ? JSON.stringify(displayContent, null, 2) : String(displayContent);
    return <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{text}</p>;
  };

  return (
    <div className="rounded-xl bg-[#131418] border border-white/[0.07] overflow-hidden transition-all duration-200 hover:border-white/[0.15]">
      <button 
        onClick={() => onToggle(contentKey)}
        className="w-full flex items-center justify-between p-4 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-white/[0.06] bg-black/20">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export function LiteratureReviewTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewData, setReviewData] = useState<LiteratureReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
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
        if (prev.length >= 10) return prev;
        return [...prev, id];
      }
    });
  };

  const handleGenerate = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 10) return;
    
    setIsLoading(true);
    setError(null);
    setReviewData(null);
    setExportSuccess(null);
    setExportError(null);
    
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
      setError("Failed to generate literature synthesis. Please retry.");
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
          formattedVal = val.map(v => typeof v === 'object' && v !== null ? ((v as Record<string, unknown>).paper_title ? `${(v as Record<string, unknown>).paper_title}: ${(v as Record<string, unknown>).citation || ''}` : JSON.stringify(v)) : `• ${v}`).join('\n');
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

  const handleExportOption = async (type: 'pdf' | 'docx') => {
    setShowExportDropdown(false);
    setIsExporting(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      if (!reviewData) return;
      const blob = await api.exportReport({
        type,
        content: reviewData
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `literature_review_${Date.now()}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(`Successfully downloaded studio ${type.toUpperCase()} report!`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate export file. Please retry.";
      console.error("Export failed:", err);
      setExportError(errorMsg);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  if (papers.length < 2) {
    return (
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
        <BookOpen className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Literature Synthesis Studio</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Index at least 2 manuscripts to author formal literature reviews with references.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Paper Selection UI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            SELECT REPOSITORY MANUSCRIPTS (2-10)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {selectedIds.length} SELECTED
          </span>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
          {papers.map(paper => {
            const isSelected = selectedIds.includes(paper.id);
            const isDisabled = !isSelected && selectedIds.length >= 10;
            return (
              <div 
                key={paper.id} 
                onClick={() => !isDisabled && handleCheckboxChange(paper.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(56,189,248,0.15)] text-white' 
                    : isDisabled
                    ? 'bg-[#131418]/40 border-white/[0.04] opacity-50 cursor-not-allowed text-zinc-500'
                    : 'bg-[#131418] border-white/[0.07] hover:border-white/20 text-zinc-300 hover:text-white'
                }`}
              >
                <div className="mt-0.5 text-cyan-400 shrink-0">
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-600" />}
                </div>
                <span className="text-xs font-medium line-clamp-2 leading-snug">{paper.title}</span>
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={selectedIds.length < 2 || selectedIds.length > 10 || isLoading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-purple-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> SYNTHESIZING LITERATURE REVIEW...</>
          ) : (
            <><BookOpen className="w-4 h-4" /> GENERATE LITERATURE REVIEW</>
          )}
        </button>
      </div>

      {/* Loading & Error States */}
      {error && (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center border border-red-500/30 bg-red-500/10 rounded-xl">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {!reviewData && !isLoading && !error && (
        <div className="rounded-xl flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] bg-black/20">
          <BookOpen className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-500 font-mono">
            Select 2 to 10 sources above to generate structured literature reviews.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {reviewData && !isLoading && (
        <div className="flex items-center justify-between gap-3 pt-2 relative">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 bg-[#131418] hover:bg-white/[0.06] border border-white/[0.1] rounded-xl text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            {copied ? <span className="text-emerald-400 font-bold">COPIED MARKDOWN!</span> : "COPY TO CLIPBOARD"}
          </button>
          
          <div className="flex-1 relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={isExporting}
              className="w-full py-2.5 px-4 bg-[#131418] hover:bg-white/[0.06] border border-white/[0.1] rounded-xl text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>EXPORTING...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>EXPORT REPORT</span>
                </>
              )}
            </button>

            {showExportDropdown && !isExporting && (
              <div className="absolute right-0 bottom-full mb-2 w-44 bg-[#131418] border border-white/[0.15] rounded-xl shadow-2xl overflow-hidden z-30">
                <button
                  onClick={() => handleExportOption('pdf')}
                  className="w-full px-4 py-3 text-left text-xs hover:bg-cyan-500/15 flex items-center gap-2.5 text-zinc-200 border-b border-white/[0.06] transition-colors cursor-pointer"
                >
                  <span className="font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">PDF</span>
                  <span className="font-sans font-medium">Document (.pdf)</span>
                </button>
                <button
                  onClick={() => handleExportOption('docx')}
                  className="w-full px-4 py-3 text-left text-xs hover:bg-purple-500/15 flex items-center gap-2.5 text-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]">DOCX</span>
                  <span className="font-sans font-medium">Word (.docx)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {exportSuccess && (
        <div className="p-3 text-center text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 shadow-lg">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Error Toast */}
      {exportError && (
        <div className="p-3 text-center text-xs font-mono font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Results UI */}
      {reviewData && !isLoading && (
        <div className="space-y-3 pt-2">
          <ExpandableReviewSection title="Review Title" contentKey="title" content={reviewData.title} isExpanded={!!expandedSections.title} onToggle={toggleSection} />
          <ExpandableReviewSection title="Introduction & Context" contentKey="introduction" content={reviewData.introduction} isExpanded={!!expandedSections.introduction} onToggle={toggleSection} />
          <ExpandableReviewSection title="Synthesized Research Objectives" contentKey="objectives" content={reviewData.research_objectives} isExpanded={!!expandedSections.objectives} onToggle={toggleSection} />
          <ExpandableReviewSection title="Related Work Survey" contentKey="related" content={reviewData.related_work} isExpanded={!!expandedSections.related} onToggle={toggleSection} />
          <ExpandableReviewSection title="Methodology Comparison Matrix" contentKey="methodology" content={reviewData.methodology_comparison} isExpanded={!!expandedSections.methodology} onToggle={toggleSection} />
          <ExpandableReviewSection title="Datasets & Benchmark Evaluation" contentKey="datasets" content={reviewData.datasets_used} isExpanded={!!expandedSections.datasets} onToggle={toggleSection} />
          <ExpandableReviewSection title="Consolidated Key Findings" contentKey="findings" content={reviewData.key_findings} isExpanded={!!expandedSections.findings} onToggle={toggleSection} />
          <ExpandableReviewSection title="Emerging Research Trends" contentKey="trends" content={reviewData.research_trends} isExpanded={!!expandedSections.trends} onToggle={toggleSection} />
          <ExpandableReviewSection title="Critical Research Gaps" contentKey="gaps" content={reviewData.research_gaps} isExpanded={!!expandedSections.gaps} onToggle={toggleSection} />
          <ExpandableReviewSection title="Future Research Scope" contentKey="scope" content={reviewData.future_scope} isExpanded={!!expandedSections.scope} onToggle={toggleSection} />
          <ExpandableReviewSection title="Consolidated Conclusion" contentKey="conclusion" content={reviewData.conclusion} isExpanded={!!expandedSections.conclusion} onToggle={toggleSection} />
          <ExpandableReviewSection title="References & Bibliography" contentKey="references" content={reviewData.references} isExpanded={!!expandedSections.references} onToggle={toggleSection} />
        </div>
      )}
    </div>
  );
}
