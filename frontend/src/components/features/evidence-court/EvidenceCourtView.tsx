"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Scale, Loader2, Gavel } from "lucide-react";
import { api } from "../../../lib/api";
import { useUpload } from "../pdf-upload/UploadContext";
import { EvidenceDrawer, PassageCard } from "../../ui/EvidenceDrawer";

interface CourtPassage {
  paper_id: string;
  paper_title: string;
  page: number;
  text: string;
  strength: string;
}

interface VerdictSentence {
  sentence: string;
  tag: string;
  source: { paper_id: string; paper_title: string; page: number; text: string } | null;
}

interface CourtResponse {
  claim: string;
  prosecution: CourtPassage[];
  defense: CourtPassage[];
  verdict: {
    label: string;
    confidence: number;
    sentences: VerdictSentence[];
  };
}

const TAG_STYLES: Record<string, { bg: string; underline: string }> = {
  supported: { bg: "#E6F4EC", underline: "#23825A" },
  contested: { bg: "#FFF4D9", underline: "#A87513" },
  unsupported: { bg: "#FBECEE", underline: "#C3424D" },
};

const LABEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  supported: { bg: "#E6F4EC", text: "#23825A", label: "Supported" },
  contested: { bg: "#FFF4D9", text: "#A87513", label: "Contested" },
  unsupported: { bg: "#FBECEE", text: "#C3424D", label: "Unsupported" },
  insufficient_evidence: { bg: "#FBFCFC", text: "#585254", label: "Insufficient Evidence" },
};

function StrengthPill({ strength }: { strength: string }) {
  const styles: Record<string, string> = {
    high: "bg-[#E6F4EC] text-[#23825A] border-[#23825A]/30",
    medium: "bg-[#FFF4D9] text-[#A87513] border-[#A87513]/30",
    low: "bg-[#FBFCFC] text-[#585254] border-[#EAE9EA]",
  };
  return (
    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${styles[strength] || styles.low}`}>
      {strength}
    </span>
  );
}

export function EvidenceCourtView() {
  const { papers } = useUpload();
  const [claim, setClaim] = useState("");
  const [result, setResult] = useState<CourtResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerSentence, setDrawerSentence] = useState<VerdictSentence | null>(null);

  const indexedPaperIds = useMemo(
    () => papers.filter((p) => p.status === "indexed" || p.status === "ready").map((p) => p.id),
    [papers]
  );

  const runCourt = async () => {
    if (claim.trim().length < 10) {
      setError("Claim must be at least 10 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setDrawerSentence(null);
    try {
      const res = await api.runEvidenceCourt(indexedPaperIds, claim.trim());
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence court failed");
    } finally {
      setLoading(false);
    }
  };

  const verdictLabel = result ? LABEL_STYLES[result.verdict.label] || LABEL_STYLES.insufficient_evidence : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pt-20 pb-10 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Claim input bar */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-[#EAE9EA] shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)] p-5">
            <h2 className="text-xl font-bold text-[#251F21] flex items-center gap-2 mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              <Scale className="w-5 h-5 text-[#397F70]" />
              Evidence Court
            </h2>
            <p className="text-xs text-[#585254] mb-4">Put a claim on trial. The prosecution and the defense argue from your papers; the judge weighs both.</p>
            <div className="flex gap-3 items-start">
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="e.g. Self-attention reduces training time compared to recurrent architectures"
                className="flex-1 min-h-[72px] resize-none rounded-xl border border-[#EAE9EA] bg-white px-4 py-3 text-sm text-[#251F21] outline-none placeholder:text-[#585254] focus:border-[#397F70] focus:ring-2 focus:ring-[#397F70]/20 transition"
              />
              <button
                onClick={runCourt}
                disabled={loading || claim.trim().length < 10}
                className="px-5 py-3 rounded-xl bg-[#397F70] hover:bg-[#2C6659] text-white font-semibold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                Try the Claim
              </button>
            </div>
            {error && <p className="text-xs text-[#C3424D] mt-3">{error}</p>}
          </motion.div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-64 rounded-2xl animate-shimmer" />
              <div className="h-64 rounded-2xl animate-shimmer" />
            </div>
          )}

          {result && !loading && (
            <>
              {/* Prosecution / Defense columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-[#EAE9EA] overflow-hidden">
                  <div className="px-4 py-3 bg-[#E6F4EC] border-b border-[#EAE9EA]">
                    <h3 className="text-sm font-bold text-[#23825A]">Prosecution</h3>
                    <p className="text-[11px] text-[#585254]">Passages supporting the claim</p>
                  </div>
                  <div className="p-4 space-y-3 bg-[#E6F4EC]/40">
                    {result.prosecution.length === 0 ? (
                      <p className="text-xs text-[#585254] italic p-2">No supporting passages found.</p>
                    ) : (
                      result.prosecution.map((p, i) => (
                        <div key={i} className="rounded-xl bg-white border border-[#EAE9EA] p-3.5 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-semibold text-xs text-[#251F21] line-clamp-1">{p.paper_title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono bg-[#FBFCFC] text-[#585254] border border-[#EAE9EA] px-2 py-0.5 rounded">Pg. {p.page}</span>
                              <StrengthPill strength={p.strength} />
                            </div>
                          </div>
                          <p className="text-xs text-[#585254] leading-relaxed">{p.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#EAE9EA] overflow-hidden">
                  <div className="px-4 py-3 bg-[#FBECEE] border-b border-[#EAE9EA]">
                    <h3 className="text-sm font-bold text-[#C3424D]">Defense</h3>
                    <p className="text-[11px] text-[#585254]">Passages contradicting the claim</p>
                  </div>
                  <div className="p-4 space-y-3 bg-[#FBECEE]/40">
                    {result.defense.length === 0 ? (
                      <p className="text-xs text-[#585254] italic p-2">No contradicting passages found.</p>
                    ) : (
                      result.defense.map((p, i) => (
                        <div key={i} className="rounded-xl bg-white border border-[#EAE9EA] p-3.5 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-semibold text-xs text-[#251F21] line-clamp-1">{p.paper_title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono bg-[#FBFCFC] text-[#585254] border border-[#EAE9EA] px-2 py-0.5 rounded">Pg. {p.page}</span>
                              <StrengthPill strength={p.strength} />
                            </div>
                          </div>
                          <p className="text-xs text-[#585254] leading-relaxed">{p.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Verdict panel */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-[#EAE9EA] shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)] p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <h3 className="text-base font-bold text-[#251F21] flex items-center gap-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    <Gavel className="w-4 h-4 text-[#397F70]" />
                    Verdict
                  </h3>
                  {verdictLabel && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: verdictLabel.bg, color: verdictLabel.text }}>
                      {verdictLabel.label}
                    </span>
                  )}
                </div>
                {/* Confidence bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-1.5 rounded-full bg-[#F7F3F1] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(result.verdict.confidence * 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-[#397F70]"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#585254]">{Math.round(result.verdict.confidence * 100)}% confidence</span>
                </div>
                {result.verdict.label === "insufficient_evidence" && result.verdict.sentences.length === 0 ? (
                  <p className="text-sm text-[#585254] italic">The corpus does not contain enough relevant text to judge this claim.</p>
                ) : (
                  <p className="text-sm leading-7 text-[#251F21]">
                    {result.verdict.sentences.map((s, i) => {
                      const style = TAG_STYLES[s.tag] || TAG_STYLES.contested;
                      const clickable = !!s.source;
                      return (
                        <span
                          key={i}
                          onClick={() => clickable && setDrawerSentence(s)}
                          className={`rounded px-1 py-0.5 mr-1 ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                          style={{ backgroundColor: style.bg, borderBottom: `1px solid ${style.underline}` }}
                          title={clickable ? "Click to see the source passage" : s.tag}
                        >
                          {s.sentence}
                        </span>
                      );
                    })}
                  </p>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      <EvidenceDrawer
        open={!!drawerSentence}
        onClose={() => setDrawerSentence(null)}
        title="Source passage"
        subtitle={drawerSentence ? `Sentence tagged "${drawerSentence.tag}"` : undefined}
      >
        {drawerSentence?.source && (
          <PassageCard
            paperTitle={drawerSentence.source.paper_title}
            page={drawerSentence.source.page}
            text={drawerSentence.source.text}
            accent={drawerSentence.tag === "supported" ? "agree" : drawerSentence.tag === "unsupported" ? "contradict" : "partial"}
          />
        )}
      </EvidenceDrawer>
    </div>
  );
}
