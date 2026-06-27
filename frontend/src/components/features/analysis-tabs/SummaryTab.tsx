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
      <div className="rounded-xl h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.1] bg-[#030304]/40">
        <FileText className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Summary Synthesis</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Select an indexed manuscript from the left repository to inspect automated insights.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-3">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        <p className="text-xs font-mono text-zinc-400">Synthesizing executive briefing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-60 space-y-3 p-6 text-center rounded-xl bg-red-500/10 border border-red-500/30">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <p className="text-xs font-mono text-red-400">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4 pb-6">
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#131418] to-[#0B0C0E] border border-cyan-500/30 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Executive Synthesis</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-serif italic border-l-2 border-cyan-500/60 pl-3">
          {summary.executive_summary}
        </p>
      </div>

      {summary.key_contributions && summary.key_contributions.length > 0 && (
        <div className="p-4 rounded-xl bg-[#131418] border border-white/[0.07] space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Key Contributions</span>
          </div>
          <ul className="space-y-2 text-xs text-zinc-300">
            {summary.key_contributions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                <span className="text-purple-400 font-mono font-bold shrink-0">0{idx+1}.</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 rounded-xl bg-[#131418] border border-white/[0.07] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>Methodology</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{summary.methodology}</p>
      </div>

      <div className="p-4 rounded-xl bg-[#131418] border border-white/[0.07] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Empirical Results</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{summary.results}</p>
      </div>

      <div className="p-4 rounded-xl bg-[#131418] border border-white/[0.07] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Known Limitations</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{summary.limitations}</p>
      </div>
    </div>
  );
}
