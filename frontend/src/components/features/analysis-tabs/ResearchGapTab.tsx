"use client";

import { useState, useEffect } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { 
  Loader2, AlertCircle, Lightbulb, ChevronDown, ChevronUp, Sparkles, 
  CheckSquare, Square, ShieldCheck, Target, HelpCircle, Layers, CheckCircle2, LayoutGrid, List
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
    <div className="rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] overflow-hidden transition-all duration-200 hover:border-[#EAE9EA]">
      <button 
        onClick={() => onToggle(contentKey)}
        className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-black/[0.04] transition-colors cursor-pointer"
      >
        <span className="text-xs font-mono font-bold text-[#397F70] uppercase tracking-wider flex items-center gap-2">
          {icon || <Sparkles className="w-3.5 h-3.5 text-[#397F70]" />}
          {title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#585254]" /> : <ChevronDown className="w-4 h-4 text-[#585254]" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-[#EAE9EA] bg-white">
          {Array.isArray(displayContent) ? (
            <ul className="space-y-2">
              {displayContent.map((item, idx) => (
                <li key={idx} className="text-xs text-[#251F21] leading-relaxed flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-[#EAE9EA]">
                  <span className="text-[#397F70] font-mono font-bold shrink-0">0{idx+1}.</span>
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
  
  const [gapViewMode, setGapViewMode] = useState<'list' | 'grid'>('list');
  const [expandedGridChip, setExpandedGridChip] = useState<string | null>(null);
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
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAE9EA] bg-[#F4EFEC]/40">
        <Lightbulb className="w-8 h-8 text-[#585254] mb-3" />
        <h3 className="text-xs font-bold text-[#251F21] uppercase tracking-wider mb-1">Gap Detection Engine</h3>
        <p className="text-xs text-[#585254] max-w-xs">
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
          <h3 className="text-[11px] font-mono font-bold text-[#585254] uppercase tracking-wider">
            SELECT TARGET DOCUMENTS ({selectedIds.length}/{papers.length})
          </h3>
          <button 
            onClick={handleSelectAll}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#397F70]/10 hover:bg-[#397F70]/20 text-[#397F70] border border-[#397F70]/20 cursor-pointer transition-colors"
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
          onClick={handleAnalyze}
          disabled={selectedIds.length === 0 || isLoading}
          className="w-full py-3 bg-[#397F70] hover:bg-[#2C6659] disabled:opacity-40 disabled:hover:bg-[#397F70] text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
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
        <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center border border-[#C3424D]/30 bg-[#C3424D]/10 rounded-xl">
          <AlertCircle className="w-6 h-6 text-[#C3424D]" />
          <p className="text-xs font-mono text-[#C3424D]">{error}</p>
        </div>
      )}

      {!gapData && !isLoading && !error && (
        <div className="rounded-xl flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAE9EA] bg-white">
          <Lightbulb className="w-8 h-8 text-[#585254] mb-2" />
          <p className="text-xs text-[#585254] font-mono">
            Click &quot;DETECT GAPS&quot; above to synthesize limitations, open questions, and research gaps across your selected manuscripts.
          </p>
        </div>
      )}

      {/* Results UI */}
      {gapData && !isLoading && (
        <div className="space-y-4 pt-2">
          {/* Quality & Scope Banner */}
          <div className="p-3 bg-[#E8F2EE] border border-[#397F70]/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#397F70]">
              <ShieldCheck className="w-4 h-4 text-[#397F70] shrink-0" />
              <span>Evidence Quality: <strong className="text-[#251F21]">{gapData.evidence_quality || "High Grounded Fidelity"}</strong></span>
            </div>
            <span className="text-[10px] font-mono text-[#585254]">{selectedIds.length} PAPERS AUDITED</span>
          </div>

          <ExpandableGapSection 
            title="Current Research Coverage" 
            contentKey="coverage" 
            content={gapData.current_research_coverage || gapData.research_coverage} 
            isExpanded={!!expandedSections.coverage} 
            onToggle={toggleSection}
            icon={<Layers className="w-3.5 h-3.5 text-[#397F70]" />}
          />

          {/* Detailed Research Gaps List */}
          <div className="rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] overflow-hidden">
            <button 
              onClick={() => toggleSection("detailedGaps")}
              className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              <span className="text-xs font-mono font-bold text-[#8469AE] uppercase tracking-wider flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#8469AE]" />
                Unresolved Research Gaps ({rawGaps.length})
              </span>
              {expandedSections.detailedGaps ? <ChevronUp className="w-4 h-4 text-[#585254]" /> : <ChevronDown className="w-4 h-4 text-[#585254]" />}
            </button>
            {expandedSections.detailedGaps && (
              <div className="p-4 border-t border-[#EAE9EA] space-y-3 bg-white">
                {/* List | Grid switcher (switching preserves the loaded analysis - no re-fetch) */}
                <div className="flex items-center justify-end gap-1 p-0.5 rounded-lg bg-[#FBFCFC] border border-[#EAE9EA] w-fit ml-auto">
                  <button
                    onClick={() => setGapViewMode('list')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${gapViewMode === 'list' ? 'bg-[#E8F2EE] text-[#397F70]' : 'text-[#585254] hover:text-[#251F21]'}`}
                  >
                    <List className="w-3 h-3" /> LIST
                  </button>
                  <button
                    onClick={() => setGapViewMode('grid')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${gapViewMode === 'grid' ? 'bg-[#E8F2EE] text-[#397F70]' : 'text-[#585254] hover:text-[#251F21]'}`}
                  >
                    <LayoutGrid className="w-3 h-3" /> GRID
                  </button>
                </div>

                {gapViewMode === 'grid' ? (
                  <GapConfidenceGrid
                    gaps={rawGaps}
                    expandedChip={expandedGridChip}
                    onToggleChip={(key) => setExpandedGridChip(expandedGridChip === key ? null : key)}
                  />
                ) : (
                rawGaps.map((item, idx) => {
                  const isObj = typeof item === 'object' && item !== null;
                  const title = isObj ? (item as DetailedGapItem).gap : String(item);
                  const type = isObj ? (item as DetailedGapItem).type : 'explicit';
                  const why = isObj ? (item as DetailedGapItem).why_it_matters : null;
                  const confidence = isObj ? (item as DetailedGapItem).confidence : 'medium';
                  const evidenceList = isObj ? (item as DetailedGapItem).evidence : [];

                  return (
                    <div key={idx} className="p-3 bg-white border border-[#EAE9EA] hover:border-[#8469AE]/30 rounded-xl space-y-2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-[#8469AE] font-mono font-bold text-xs shrink-0">0{idx+1}.</span>
                          <span className="text-xs font-bold text-[#251F21]">{title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            type === 'explicit' 
                              ? 'bg-[#23825A]/10 text-[#23825A] border-[#23825A]/20' 
                              : 'bg-[#A87513]/10 text-[#A87513] border-[#A87513]/20'
                          }`}>
                            {type || 'explicit'}
                          </span>
                          {confidence && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#FBFCFC] text-[#585254] border border-[#EAE9EA]">
                              {confidence} conf
                            </span>
                          )}
                        </div>
                      </div>
                      {why && (
                        <p className="text-[11px] text-[#585254] pl-5">
                          <strong className="text-[#251F21]">Why it matters:</strong> {why}
                        </p>
                      )}
                      {evidenceList && evidenceList.length > 0 && (
                        <div className="pl-5 pt-1 space-y-1">
                          {evidenceList.map((ev, eIdx) => (
                            <div key={eIdx} className="text-[10px] font-mono text-[#585254] italic bg-[#FBFCFC] p-1.5 rounded border border-[#EAE9EA]">
                              &quot;{ev}&quot;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>

          <ExpandableGapSection 
            title="Explicit Limitations Mentioned" 
            contentKey="limitations" 
            content={gapData.explicit_limitations} 
            isExpanded={!!expandedSections.limitations} 
            onToggle={toggleSection}
            icon={<AlertCircle className="w-3.5 h-3.5 text-[#A87513]" />}
          />

          <ExpandableGapSection 
            title="Common Themes Identified" 
            contentKey="themes" 
            content={gapData.common_themes} 
            isExpanded={!!expandedSections.themes} 
            onToggle={toggleSection}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#23825A]" />}
          />

          <ExpandableGapSection 
            title="Conflicting Empirical Findings" 
            contentKey="conflicts" 
            content={gapData.conflicting_findings} 
            isExpanded={!!expandedSections.conflicts} 
            onToggle={toggleSection}
            icon={<AlertCircle className="w-3.5 h-3.5 text-[#C3424D]" />}
          />

          <ExpandableGapSection 
            title="Future Research Opportunities" 
            contentKey="opportunities" 
            content={gapData.future_research_opportunities} 
            isExpanded={!!expandedSections.opportunities} 
            onToggle={toggleSection}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#8469AE]" />}
          />

          <ExpandableGapSection 
            title="Actionable Research Questions" 
            contentKey="questions" 
            content={gapData.potential_research_questions || gapData.research_questions} 
            isExpanded={!!expandedSections.questions} 
            onToggle={toggleSection}
            icon={<HelpCircle className="w-3.5 h-3.5 text-[#397F70]" />}
          />
        </div>
      )}
    </div>
  );
}


// ------------------------------------------------------------------
// Gap-confidence Grid: X = explicit vs inferred, Y = confidence
// ------------------------------------------------------------------

interface GapConfidenceGridProps {
  gaps: (string | DetailedGapItem)[];
  expandedChip: string | null;
  onToggleChip: (key: string) => void;
}

const CONF_ROWS: { key: string; label: string; dot: string }[] = [
  { key: 'high', label: 'High confidence', dot: '#397F70' },
  { key: 'medium', label: 'Medium confidence', dot: '#A87513' },
  { key: 'low', label: 'Low confidence', dot: '#585254' },
];
const TYPE_COLS = [
  { key: 'explicit', label: 'Explicit' },
  { key: 'inferred', label: 'Inferred' },
];

function normalizeGap(item: string | DetailedGapItem): DetailedGapItem {
  if (typeof item === 'object' && item !== null) return item;
  return { gap: String(item), type: 'explicit', confidence: 'medium' };
}

function GapConfidenceGrid({ gaps, expandedChip, onToggleChip }: GapConfidenceGridProps) {
  const normalized = gaps.map((g, i) => ({ ...normalizeGap(g), _key: `chip-${i}` }));
  const cellOf = (type: string, conf: string) =>
    normalized.filter((g) => {
      const t = (g.type || 'explicit').toLowerCase() === 'explicit' ? 'explicit' : 'inferred';
      const c = ['high', 'medium', 'low'].includes((g.confidence || '').toLowerCase()) ? (g.confidence || '').toLowerCase() : 'medium';
      return t === type && c === conf;
    });

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
        <div />
        {TYPE_COLS.map((col) => (
          <div key={col.key} className="text-center text-[10px] font-mono font-bold uppercase tracking-wider text-[#585254] py-1">
            {col.label} ({normalized.filter((g) => ((g.type || 'explicit').toLowerCase() === 'explicit' ? 'explicit' : 'inferred') === col.key).length})
          </div>
        ))}
      </div>
      {CONF_ROWS.map((row) => (
        <div key={row.key} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-stretch">
          <div className="flex items-center gap-1.5 pr-1 w-24">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.dot }} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wide text-[#585254] leading-tight">{row.label.replace(' confidence', '')}</span>
          </div>
          {TYPE_COLS.map((col) => {
            const cell = cellOf(col.key, row.key);
            return (
              <div key={col.key} className="rounded-xl border border-[#EAE9EA] bg-[#FBFCFC] p-2 space-y-2 min-h-[3.5rem]">
                {cell.length === 0 ? (
                  <p className="text-[10px] text-[#585254]/60 italic text-center py-2">-</p>
                ) : (
                  cell.map((g) => {
                    const expanded = expandedChip === g._key;
                    return (
                      <div
                        key={g._key}
                        onClick={() => onToggleChip(g._key)}
                        className="rounded-lg bg-white border border-[#EAE9EA] hover:border-[#397F70]/40 p-2.5 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: row.dot }} />
                          <p className={`text-[11px] text-[#251F21] leading-snug flex-1 ${expanded ? '' : 'line-clamp-3'}`}>{g.gap}</p>
                          {(g.supporting_papers?.length ?? 0) > 0 && (
                            <span className="text-[9px] font-mono bg-[#E8F2EE] text-[#397F70] px-1.5 py-0.5 rounded shrink-0">
                              {g.supporting_papers!.length}p
                            </span>
                          )}
                        </div>
                        {expanded && (
                          <div className="mt-2 pt-2 border-t border-[#EAE9EA] space-y-2">
                            {g.why_it_matters && (
                              <div>
                                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#8469AE] mb-1">Why it matters</p>
                                <p className="text-[11px] text-[#585254] leading-relaxed">{g.why_it_matters}</p>
                              </div>
                            )}
                            {(g.evidence?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#397F70] mb-1">Evidence</p>
                                <ul className="space-y-1">
                                  {g.evidence!.map((e, ei) => (
                                    <li key={ei} className="text-[11px] text-[#585254] leading-relaxed flex items-start gap-1.5">
                                      <span className="text-[#397F70] shrink-0">-</span>
                                      <span>{e}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(g.supporting_papers?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#585254] mb-1">Supporting papers</p>
                                <p className="text-[11px] text-[#585254]">{g.supporting_papers!.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
