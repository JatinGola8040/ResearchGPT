"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, Lightbulb, ChevronDown, ChevronUp, Sparkles, CheckSquare, Square } from "lucide-react";

interface GapAnalysisData {
  current_research_coverage?: string | string[];
  common_themes?: string | string[];
  conflicting_findings?: string | string[];
  research_gaps?: string | string[];
  future_research_opportunities?: string | string[];
  potential_research_questions?: string | string[];
  [key: string]: unknown;
}

interface ExpandableGapSectionProps {
  title: string;
  contentKey: string;
  content?: string | string[];
  isExpanded: boolean;
  onToggle: (key: string) => void;
}

function ExpandableGapSection({ title, contentKey, content, isExpanded, onToggle }: ExpandableGapSectionProps) {
  const hasContent = content && (!Array.isArray(content) || content.length > 0);
  const displayContent = hasContent ? content : "No specific details identified.";
  
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
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{displayContent}</p>
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
    themes: true,
    conflicts: true,
    gaps: true,
    opportunities: true,
    questions: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        if (prev.length >= 5) return prev;
        return [...prev, id];
      }
    });
  };

  const handleAnalyze = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) return;
    
    setIsLoading(true);
    setError(null);
    setGapData(null);
    
    try {
      const data = await api.analyzeGaps(selectedIds);
      const res = data.gap_analysis || data.gaps || data.analysis || data;
      setGapData({
        current_research_coverage: res.current_research_coverage || res.currentResearchCoverage || res.coverage,
        common_themes: res.common_themes || res.commonThemes || res.themes,
        conflicting_findings: res.conflicting_findings || res.conflictingFindings || res.conflicts,
        research_gaps: res.research_gaps || res.researchGaps || res.gaps,
        future_research_opportunities: res.future_research_opportunities || res.futureResearchOpportunities || res.opportunities,
        potential_research_questions: res.potential_research_questions || res.potentialResearchQuestions || res.questions,
      });
    } catch (err) {
      console.error("Failed to detect research gaps:", err);
      setError("Failed to synthesize gap intelligence. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  if (papers.length < 2) {
    return (
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
        <Lightbulb className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Gap Detection Engine</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Index at least 2 manuscripts to uncover uncharted research trajectories and conflicting data.
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
            SELECT TARGET DOCUMENTS (2-5)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {selectedIds.length} SELECTED
          </span>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
          {papers.map(paper => {
            const isSelected = selectedIds.includes(paper.id);
            const isDisabled = !isSelected && selectedIds.length >= 5;
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
          disabled={selectedIds.length < 2 || selectedIds.length > 5 || isLoading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-purple-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> SCANNING FOR GAPS...</>
          ) : (
            <><Lightbulb className="w-4 h-4" /> DETECT RESEARCH GAPS</>
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
          <p className="text-xs text-zinc-500 font-mono">
            Select sources above and scan repository to reveal novel opportunities.
          </p>
        </div>
      )}

      {/* Results UI */}
      {gapData && !isLoading && (
        <div className="space-y-3 pt-2">
          <ExpandableGapSection title="Current Research Coverage" contentKey="coverage" content={gapData.current_research_coverage} isExpanded={!!expandedSections.coverage} onToggle={toggleSection} />
          <ExpandableGapSection title="Common Themes Identified" contentKey="themes" content={gapData.common_themes} isExpanded={!!expandedSections.themes} onToggle={toggleSection} />
          <ExpandableGapSection title="Conflicting Empirical Findings" contentKey="conflicts" content={gapData.conflicting_findings} isExpanded={!!expandedSections.conflicts} onToggle={toggleSection} />
          <ExpandableGapSection title="Critical Research Gaps" contentKey="gaps" content={gapData.research_gaps} isExpanded={!!expandedSections.gaps} onToggle={toggleSection} />
          <ExpandableGapSection title="Future Research Opportunities" contentKey="opportunities" content={gapData.future_research_opportunities} isExpanded={!!expandedSections.opportunities} onToggle={toggleSection} />
          <ExpandableGapSection title="Suggested Research Questions" contentKey="questions" content={gapData.potential_research_questions} isExpanded={!!expandedSections.questions} onToggle={toggleSection} />
        </div>
      )}
    </div>
  );
}
