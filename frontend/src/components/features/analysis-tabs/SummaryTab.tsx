"use client";

import { useEffect, useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, FileText, Sparkles, CheckCircle, Cpu, BarChart2, ShieldAlert } from "lucide-react";

interface SummaryData {
  executive_summary?: string;
  key_contributions?: string[];
  methodology?: string;
  results?: string;
  limitations?: string;
}

export function SummaryTab() {
  const { selectedPaperId } = useUpload();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPaperId) {
      setSummary(null);
      setError(null);
      return;
    }

    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getSummary(selectedPaperId);
        
        setSummary({
          executive_summary: data.executive_summary || data.summary || "No executive summary provided.",
          key_contributions: Array.isArray(data.key_contributions) ? data.key_contributions : [],
          methodology: data.methodology || "No methodology detailed.",
          results: data.results || "No results detailed.",
          limitations: data.limitations || "No limitations detailed."
        });
      } catch (err) {
        console.error("Failed to load summary:", err);
        setError("Failed to generate summary synthesis. Please retry.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [selectedPaperId]);

  if (!selectedPaperId) {
    return (
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAE9EA] bg-[#F4EFEC]/40">
        <FileText className="w-8 h-8 text-[#585254] mb-3" />
        <h3 className="text-xs font-bold text-[#251F21] uppercase tracking-wider mb-1">Summary Synthesis</h3>
        <p className="text-xs text-[#585254] max-w-xs">
          Select an indexed manuscript from the left repository to inspect automated insights.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-3">
        <Loader2 className="w-6 h-6 text-[#397F70] animate-spin" />
        <p className="text-xs font-mono text-[#585254]">Synthesizing executive briefing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-3 p-6 text-center rounded-xl bg-[#C3424D]/10 border border-[#C3424D]/30">
        <AlertCircle className="w-6 h-6 text-[#C3424D]" />
        <p className="text-xs font-mono text-[#C3424D]">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4 pb-6">
      <div className="p-4 rounded-xl bg-white border border-[#397F70]/30 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#397F70] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#397F70]" />
          <span>Executive Synthesis</span>
        </div>
        <p className="text-xs text-[#251F21] leading-relaxed font-serif italic border-l-2 border-[#397F70]/60 pl-3">
          {summary.executive_summary}
        </p>
      </div>

      {summary.key_contributions && summary.key_contributions.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8469AE] uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Key Contributions</span>
          </div>
          <ul className="space-y-2 text-xs text-[#251F21]">
            {summary.key_contributions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#EAE9EA]">
                <span className="text-[#8469AE] font-mono font-bold shrink-0">0{idx+1}.</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#397F70] uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>Methodology</span>
        </div>
        <p className="text-xs text-[#585254] leading-relaxed">{summary.methodology}</p>
      </div>

      <div className="p-4 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#23825A] uppercase tracking-wider">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Empirical Results</span>
        </div>
        <p className="text-xs text-[#585254] leading-relaxed">{summary.results}</p>
      </div>

      <div className="p-4 rounded-xl bg-[#FBFCFC] border border-[#EAE9EA] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#8469AE] uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Known Limitations</span>
        </div>
        <p className="text-xs text-[#585254] leading-relaxed">{summary.limitations}</p>
      </div>
    </div>
  );
}
