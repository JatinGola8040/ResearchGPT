"use client";

import { useState, useEffect } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { 
  Loader2, AlertCircle, Lightbulb, ChevronDown, ChevronUp, Sparkles, 
  CheckSquare, Square, ShieldCheck, Target, HelpCircle, Layers, CheckCircle2
} from "lucide-react";
import { MarkdownRenderer } from "../../ui/MarkdownRenderer";

interface DetailedGapItem {
  gap: string;
  type?: 'explicit' | 'inferred' | string;
  why_it_matters?: string;
  supporting_papers?: string[];
  evidence?: string[];
  confidence?: 'high' | 'medium' | 'low' | string;
}

interface GapAnalysisData {
  current_research_coverage?: string;
  research_coverage?: string;
  common_themes?: string[];
  explicit_limitations?: string[];
  conflicting_findings?: string[];
  research_gaps?: (string | DetailedGapItem)[];
  detailed_gaps?: DetailedGapItem[];
  future_research_opportunities?: string[];
  potential_research_questions?: string[];
  research_questions?: string[];
  evidence_quality?: string;
  citations?: Array<{
    paper_title: string;
    page: number;
    snippet: string;
  }>;
  [key: string]: unknown;
}

interface ExpandableGapSectionProps {
  title: string;
  contentKey: string;
  content?: string | string[];
  isExpanded: boolean;
  onToggle: (key: string) => void;
  icon?: React.ReactNode;
}

function ExpandableGapSection({ title, contentKey, content, isExpanded, onToggle, icon }: ExpandableGapSectionProps) {
  const hasContent = content && (!Array.isArray(content) || content.length > 0);
  const displayContent = hasContent ? content : "Evidence is limited in the current corpus.";
  
  return (
    <div className="rounded-xl bg-[#131418] border border-white/[0.07] overflow-hidden transition-all duration-200 hover:border-white/[0.15]">
      <button 
        onClick={() => onToggle(contentKey)}
        className="w-full flex items-center justify-between p-4 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          {icon || <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-white/[0.06] bg-black/20">
          {Array.isArray(displayContent) ? (
            <ul className="space-y-2">
              {displayContent.map((item, idx) => (
                <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.03]">
                  <span className="text-cyan-400 font-mono font-bold shrink-0">0{idx+1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <MarkdownRenderer content={displayContent} className="text-xs" />
          )}
        </div>
      )}
    </div>
  );
}

export function ResearchGapTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gapData, setGapData] = useState<GapAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    coverage: true,
    detailedGaps: true,
    themes: true,
    limitations: true,
    conflicts: true,
    opportunities: true,
    questions: true,
  });

  // Auto-select first 3 papers if none selected
  useEffect(() => {
    if (papers.length > 0 && selectedIds.length === 0) {
      setSelectedIds(papers.slice(0, Math.min(3, papers.length)).map(p => p.id));
    }
  }, [papers, selectedIds.length]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        if (prev.length >= 8) return prev;
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === papers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(papers.slice(0, 8).map(p => p.id));
    }
  };

  const handleAnalyze = async () => {
    if (selectedIds.length < 1) {
      setError("Please select at least one paper to analyze.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGapData(null);
    
    try {
      const data = await api.analyzeGaps(selectedIds);
      const res = data.analysis || data.gap_analysis || data.gaps || data;
      setGapData({
        current_research_coverage: res.current_research_coverage || res.research_coverage,
        research_coverage: res.research_coverage || res.current_research_coverage,
        common_themes: res.common_themes || res.themes,
        explicit_limitations: res.explicit_limitations || res.limitations,
        conflicting_findings: res.conflicting_findings || res.conflicts,
        research_gaps: res.research_gaps || res.gaps,
        detailed_gaps: res.detailed_gaps || (Array.isArray(res.research_gaps) && typeof res.research_gaps[0] === 'object' ? res.research_gaps : []),
        future_research_opportunities: res.future_research_opportunities || res.opportunities,
        potential_research_questions: res.potential_research_questions || res.research_questions,
        research_questions: res.research_questions || res.potential_research_questions,
        evidence_quality: res.evidence_quality,
        citations: data.citations || []
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to synthesize gap intelligence. Please retry.";
      console.error("Failed to detect research gaps:", err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (papers.length === 0) {
    return (
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
        <Lightbulb className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Gap Detection Engine</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Upload and index research manuscripts to uncover unexplored trajectories and conflicting empirical findings.
        </p>
      </div>
    );
  }

  const rawGaps = gapData?.detailed_gaps && gapData.detailed_gaps.length > 0 
    ? gapData.detailed_gaps 
    : (Array.isArray(gapData?.research_gaps) ? gapData!.research_gaps : []);

  return (
    <div className="space-y-6 pb-6">
      {/* Paper Selection UI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            SELECT TARGET DOCUMENTS ({selectedIds.length}/{papers.length})
          </h3>
          <button 
            onClick={handleSelectAll}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 cursor-pointer transition-colors"
          >
            {selectedIds.length === papers.length ? "DESELECT ALL" : "SELECT ALL"}
          </button>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
          {papers.map(paper => {
            const isSelected = selectedIds.includes(paper.id);
            const isDisabled = !isSelected && selectedIds.length >= 8;
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
          onClick={handleAnalyze}
          disabled={selectedIds.length === 0 || isLoading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-purple-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> ANALYZING {selectedIds.length} PAPERS...</>
          ) : (
            <><Lightbulb className="w-4 h-4" /> DETECT GAPS ACROSS {selectedIds.length} PAPERS</>
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

      {!gapData && !isLoading && !error && (
        <div className="rounded-xl flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] bg-black/20">
          <Lightbulb className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-400 font-mono">
            Click &quot;DETECT GAPS&quot; above to synthesize limitations, open questions, and research gaps across your selected manuscripts.
          </p>
        </div>
      )}

      {/* Results UI */}
      {gapData && !isLoading && (
        <div className="space-y-4 pt-2">
          {/* Quality & Scope Banner */}
          <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Evidence Quality: <strong className="text-white">{gapData.evidence_quality || "High Grounded Fidelity"}</strong></span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{selectedIds.length} PAPERS AUDITED</span>
          </div>

          <ExpandableGapSection 
            title="Current Research Coverage" 
            contentKey="coverage" 
            content={gapData.current_research_coverage || gapData.research_coverage} 
            isExpanded={!!expandedSections.coverage} 
            onToggle={toggleSection}
            icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
          />

          {/* Detailed Research Gaps List */}
          <div className="rounded-xl bg-[#131418] border border-white/[0.07] overflow-hidden">
            <button 
              onClick={() => toggleSection("detailedGaps")}
              className="w-full flex items-center justify-between p-4 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                Unresolved Research Gaps ({rawGaps.length})
              </span>
              {expandedSections.detailedGaps ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            {expandedSections.detailedGaps && (
              <div className="p-4 border-t border-white/[0.06] space-y-3 bg-black/20">
                {rawGaps.map((item, idx) => {
                  const isObj = typeof item === 'object' && item !== null;
                  const title = isObj ? (item as DetailedGapItem).gap : String(item);
                  const type = isObj ? (item as DetailedGapItem).type : 'explicit';
                  const why = isObj ? (item as DetailedGapItem).why_it_matters : null;
                  const confidence = isObj ? (item as DetailedGapItem).confidence : 'medium';
                  const evidenceList = isObj ? (item as DetailedGapItem).evidence : [];

                  return (
                    <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.04] hover:border-purple-500/30 rounded-xl space-y-2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-purple-400 font-mono font-bold text-xs shrink-0">0{idx+1}.</span>
                          <span className="text-xs font-bold text-zinc-200">{title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            type === 'explicit' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {type || 'explicit'}
                          </span>
                          {confidence && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {confidence} conf
                            </span>
                          )}
                        </div>
                      </div>
                      {why && (
                        <p className="text-[11px] text-zinc-400 pl-5">
                          <strong className="text-zinc-300">Why it matters:</strong> {why}
                        </p>
                      )}
                      {evidenceList && evidenceList.length > 0 && (
                        <div className="pl-5 pt-1 space-y-1">
                          {evidenceList.map((ev, eIdx) => (
                            <div key={eIdx} className="text-[10px] font-mono text-zinc-400 italic bg-black/30 p-1.5 rounded border border-white/[0.02]">
                              &quot;{ev}&quot;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ExpandableGapSection 
            title="Explicit Limitations Mentioned" 
            contentKey="limitations" 
            content={gapData.explicit_limitations} 
            isExpanded={!!expandedSections.limitations} 
            onToggle={toggleSection}
            icon={<AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
          />

          <ExpandableGapSection 
            title="Common Themes Identified" 
            contentKey="themes" 
            content={gapData.common_themes} 
            isExpanded={!!expandedSections.themes} 
            onToggle={toggleSection}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          />

          <ExpandableGapSection 
            title="Conflicting Empirical Findings" 
            contentKey="conflicts" 
            content={gapData.conflicting_findings} 
            isExpanded={!!expandedSections.conflicts} 
            onToggle={toggleSection}
            icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />}
          />

          <ExpandableGapSection 
            title="Future Research Opportunities" 
            contentKey="opportunities" 
            content={gapData.future_research_opportunities} 
            isExpanded={!!expandedSections.opportunities} 
            onToggle={toggleSection}
            icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
          />

          <ExpandableGapSection 
            title="Actionable Research Questions" 
            contentKey="questions" 
            content={gapData.potential_research_questions || gapData.research_questions} 
            isExpanded={!!expandedSections.questions} 
            onToggle={toggleSection}
            icon={<HelpCircle className="w-3.5 h-3.5 text-cyan-400" />}
          />
        </div>
      )}
    </div>
  );
}
