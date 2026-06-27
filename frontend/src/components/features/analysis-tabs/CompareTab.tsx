"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, GitCompare, ChevronDown, ChevronUp, Sparkles, CheckSquare, Square } from "lucide-react";

interface CompareData {
  research_objective?: string;
  methodology?: string;
  datasets?: string;
  strengths?: string;
  limitations?: string;
  key_differences?: string;
  overall_conclusion?: string;
}

interface ExpandableCardProps {
  title: string;
  contentKey: string;
  content?: string;
  isExpanded: boolean;
  onToggle: (key: string) => void;
}

function ExpandableSection({ title, contentKey, content, isExpanded, onToggle }: ExpandableCardProps) {
  if (!content) return null;
  
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
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{content}</p>
        </div>
      )}
    </div>
  );
}

export function CompareTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objective: true,
    methodology: false,
    datasets: false,
    strengths: false,
    limitations: false,
    differences: true,
    conclusion: true,
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

  const handleCompare = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) return;
    
    setIsLoading(true);
    setError(null);
    setCompareData(null);
    
    try {
      const data = await api.comparePapers(selectedIds);
      const comparison = data.comparison || data;
      setCompareData(comparison);
    } catch (err) {
      console.error("Failed to compare papers:", err);
      setError("Failed to synthesize multi-paper matrix. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  if (papers.length < 2) {
    return (
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
        <GitCompare className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Comparative Matrix</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Index at least 2 PDF manuscripts to activate cross-document delta analysis.
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
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || selectedIds.length > 5 || isLoading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-purple-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> SYNTHESIZING DELTAS...</>
          ) : (
            <><GitCompare className="w-4 h-4" /> GENERATE COMPARATIVE MATRIX</>
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

      {!compareData && !isLoading && !error && (
        <div className="rounded-xl flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] bg-black/20">
          <GitCompare className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-500 font-mono">
            Select sources above and trigger generation to evaluate methodologies.
          </p>
        </div>
      )}

      {/* Results UI */}
      {compareData && !isLoading && (
        <div className="space-y-3 pt-2">
          <ExpandableSection title="Research Objective" contentKey="objective" content={compareData.research_objective} isExpanded={!!expandedSections.objective} onToggle={toggleSection} />
          <ExpandableSection title="Methodology" contentKey="methodology" content={compareData.methodology} isExpanded={!!expandedSections.methodology} onToggle={toggleSection} />
          <ExpandableSection title="Datasets Evaluated" contentKey="datasets" content={compareData.datasets} isExpanded={!!expandedSections.datasets} onToggle={toggleSection} />
          <ExpandableSection title="Identified Strengths" contentKey="strengths" content={compareData.strengths} isExpanded={!!expandedSections.strengths} onToggle={toggleSection} />
          <ExpandableSection title="Documented Limitations" contentKey="limitations" content={compareData.limitations} isExpanded={!!expandedSections.limitations} onToggle={toggleSection} />
          <ExpandableSection title="Key Delta & Differences" contentKey="differences" content={compareData.key_differences} isExpanded={!!expandedSections.differences} onToggle={toggleSection} />
          <ExpandableSection title="Synthesized Conclusion" contentKey="conclusion" content={compareData.overall_conclusion} isExpanded={!!expandedSections.conclusion} onToggle={toggleSection} />
        </div>
      )}
    </div>
  );
}
