"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

interface GapAnalysisData {
  current_research_coverage?: string | string[];
  common_themes?: string | string[];
  conflicting_findings?: string | string[];
  research_gaps?: string | string[];
  future_research_opportunities?: string | string[];
  potential_research_questions?: string | string[];
  [key: string]: any;
}

export function ResearchGapTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gapData, setGapData] = useState<GapAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track expandable states
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
        if (prev.length >= 5) return prev; // max 5 enforcement
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
      setError("Failed to perform gap analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const ExpandableCard = ({ title, contentKey, content }: { title: string, contentKey: string, content?: string | string[] }) => {
    const isExpanded = expandedSections[contentKey];
    const hasContent = content && (!Array.isArray(content) || content.length > 0);
    const displayContent = hasContent ? content : "No specific details identified.";
    
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
            {Array.isArray(displayContent) ? (
              <ul className="space-y-1.5">
                {displayContent.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted leading-relaxed flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{displayContent}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Early return if not enough papers are uploaded
  if (papers.length < 2) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
        <Lightbulb className="w-10 h-10 text-muted mb-4 opacity-50" />
        <h3 className="text-sm font-medium text-foreground mb-2">Research Gaps View</h3>
        <p className="text-xs text-muted">
          Upload at least 2 papers to detect research gaps and opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Paper Selection UI */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Select Papers (2-5)
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
                disabled={!selectedIds.includes(paper.id) && selectedIds.length >= 5}
              />
              <span className="text-sm text-foreground line-clamp-2 leading-tight">{paper.title}</span>
            </label>
          ))}
        </div>
        
        <button 
          onClick={handleAnalyze}
          disabled={selectedIds.length < 2 || selectedIds.length > 5 || isLoading}
          className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Gaps...</>
          ) : (
            <><Lightbulb className="w-4 h-4" /> Detect Research Gaps</>
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

      {!gapData && !isLoading && !error && (
        <div className="card flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent mt-4">
          <Lightbulb className="w-8 h-8 text-muted mb-3 opacity-30" />
          <p className="text-xs text-muted">
            Select 2 to 5 papers and click detect research gaps to generate insights.
          </p>
        </div>
      )}

      {/* Results UI with Expandable Cards */}
      {gapData && !isLoading && (
        <div className="space-y-3 mt-4">
          <ExpandableCard title="Current Research Coverage" contentKey="coverage" content={gapData.current_research_coverage} />
          <ExpandableCard title="Common Themes" contentKey="themes" content={gapData.common_themes} />
          <ExpandableCard title="Conflicting Findings" contentKey="conflicts" content={gapData.conflicting_findings} />
          <ExpandableCard title="Research Gaps" contentKey="gaps" content={gapData.research_gaps} />
          <ExpandableCard title="Future Research Opportunities" contentKey="opportunities" content={gapData.future_research_opportunities} />
          <ExpandableCard title="Potential Research Questions" contentKey="questions" content={gapData.potential_research_questions} />
        </div>
      )}
    </div>
  );
}
