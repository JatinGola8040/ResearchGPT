"use client";

import { useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, GitCompare, ChevronDown, ChevronUp } from "lucide-react";

interface CompareData {
  research_objective?: string;
  methodology?: string;
  datasets?: string;
  strengths?: string;
  limitations?: string;
  key_differences?: string;
  overall_conclusion?: string;
}

export function CompareTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track expandable states
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
        if (prev.length >= 5) return prev; // max 5 enforcement
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
      // Ensure we extract the comparison data safely if it is nested
      const comparison = data.comparison || data;
      setCompareData(comparison);
    } catch (err) {
      console.error("Failed to compare papers:", err);
      setError("Failed to generate comparison. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const ExpandableCard = ({ title, contentKey, content }: { title: string, contentKey: string, content?: string }) => {
    if (!content) return null;
    const isExpanded = expandedSections[contentKey];
    
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
          <div className="p-4 pt-0 border-t border-border/50">
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        )}
      </div>
    );
  };

  // Early return if not enough papers are uploaded
  if (papers.length < 2) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
        <GitCompare className="w-10 h-10 text-muted mb-4 opacity-50" />
        <h3 className="text-sm font-medium text-foreground mb-2">Compare View</h3>
        <p className="text-xs text-muted">
          Upload at least 2 papers to use the comparison tool.
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
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || selectedIds.length > 5 || isLoading}
          className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><GitCompare className="w-4 h-4" /> Compare Selected</>
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

      {!compareData && !isLoading && !error && (
        <div className="card flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent mt-4">
          <GitCompare className="w-8 h-8 text-muted mb-3 opacity-30" />
          <p className="text-xs text-muted">
            Select 2 to 5 papers and click compare to generate insights.
          </p>
        </div>
      )}

      {/* Results UI with Expandable Cards */}
      {compareData && !isLoading && (
        <div className="space-y-3 mt-4">
          <ExpandableCard title="Research Objective" contentKey="objective" content={compareData.research_objective} />
          <ExpandableCard title="Methodology" contentKey="methodology" content={compareData.methodology} />
          <ExpandableCard title="Datasets" contentKey="datasets" content={compareData.datasets} />
          <ExpandableCard title="Strengths" contentKey="strengths" content={compareData.strengths} />
          <ExpandableCard title="Limitations" contentKey="limitations" content={compareData.limitations} />
          <ExpandableCard title="Key Differences" contentKey="differences" content={compareData.key_differences} />
          <ExpandableCard title="Overall Conclusion" contentKey="conclusion" content={compareData.overall_conclusion} />
        </div>
      )}
    </div>
  );
}
