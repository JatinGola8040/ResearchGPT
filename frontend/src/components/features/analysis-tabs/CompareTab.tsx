"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, GitCompare, ChevronDown, ChevronUp, Sparkles, CheckSquare, Square } from "lucide-react";
import { MarkdownRenderer } from "../../ui/MarkdownRenderer";

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
    <div className="rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] overflow-hidden transition-all duration-200 hover:border-[#EAE9EA]">
      <button 
        onClick={() => onToggle(contentKey)}
        className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-black/[0.04] transition-colors cursor-pointer"
      >
        <span className="text-xs font-mono font-bold text-[#397F70] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#397F70]" />
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#585254]" /> : <ChevronDown className="w-4 h-4 text-[#585254]" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-[#EAE9EA] bg-white">
          <MarkdownRenderer content={content} className="text-xs" />
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
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAE9EA] bg-[#F4EFEC]/40">
        <GitCompare className="w-8 h-8 text-[#585254] mb-3" />
        <h3 className="text-xs font-bold text-[#251F21] uppercase tracking-wider mb-1">Comparative Matrix</h3>
        <p className="text-xs text-[#585254] max-w-xs">
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
          <h3 className="text-[11px] font-mono font-bold text-[#585254] uppercase tracking-wider">
            SELECT TARGET DOCUMENTS (2-5)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#397F70]/10 text-[#397F70] border border-[#397F70]/20">
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
                    ? 'bg-[#E8F2EE] border-[#397F70]/60 shadow-sm text-[#397F70]' 
                    : isDisabled
                    ? 'bg-[#FBFCFC]/40 border-[#EAE9EA] opacity-50 cursor-not-allowed text-[#585254]'
                    : 'bg-[#FBFCFC] border-[#EAE9EA] hover:border-[#EAE9EA] text-[#251F21] hover:text-[#251F21]'
                }`}
              >
                <div className="mt-0.5 text-[#397F70] shrink-0">
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-[#585254]" />}
                </div>
                <span className="text-xs font-medium line-clamp-2 leading-snug">{paper.title}</span>
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || selectedIds.length > 5 || isLoading}
          className="w-full py-3 bg-[#397F70] hover:bg-[#2C6659] disabled:opacity-40 disabled:hover:bg-[#397F70] text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
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
        <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center border border-[#C3424D]/30 bg-[#C3424D]/10 rounded-xl">
          <AlertCircle className="w-6 h-6 text-[#C3424D]" />
          <p className="text-xs font-mono text-[#C3424D]">{error}</p>
        </div>
      )}

      {!compareData && !isLoading && !error && (
        <div className="rounded-xl flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAE9EA] bg-white">
          <GitCompare className="w-8 h-8 text-[#585254] mb-2" />
          <p className="text-xs text-[#585254] font-mono">
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
