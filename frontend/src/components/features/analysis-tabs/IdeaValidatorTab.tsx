"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckSquare,
  ClipboardList,
  Copy,
  FlaskConical,
  Lightbulb,
  Loader2,
  Radar,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
} from "lucide-react";

interface ExistingWorkItem {
  paper_id: string;
  paper_title: string;
  relevance: "high" | "medium" | "low" | string;
  existing_contribution: string;
  overlap_with_idea: string;
  evidence_pages: number[];
}

interface OverlapDimension {
  level: "high" | "medium" | "low" | string;
  rationale: string;
}

interface NoveltySignal {
  dimension: string;
  signal: "high" | "medium" | "low" | string;
  rationale: string;
}

interface GapItem {
  gap: string;
  type: string;
  why_it_matters: string;
  supporting_papers: string[];
  evidence: string[];
  confidence: "high" | "medium" | "low" | string;
}

interface BaselineItem {
  baseline: string;
  why_it_matters: string;
  paper: string;
  evidence: string;
}

interface HypothesisSet {
  h1: string;
  h0: string;
}

interface ExperimentBlueprint {
  dataset: string[];
  baselines: string[];
  proposed_method: string;
  experimental_setup: string;
  variables: string[];
  evaluation_metrics: string[];
  ablation_study: string[];
  expected_comparison: string;
}

interface IdeaValidationResult {
  idea: string;
  corpus_summary: string;
  existing_work: ExistingWorkItem[];
  overlap_analysis: Record<string, OverlapDimension>;
  novelty_signals: NoveltySignal[];
  research_gaps: GapItem[];
  potential_contribution: string;
  research_questions: string[];
  hypothesis: HypothesisSet;
  experiment_blueprint: ExperimentBlueprint;
  baselines: BaselineItem[];
  potential_contributions: string[];
  citations: Array<{
    paper_title: string;
    page: number;
    snippet: string;
  }>;
  evidence_quality: string;
}

const LOADING_STAGES = [
  "Reading your idea",
  "Searching indexed literature",
  "Mapping existing work",
  "Identifying gaps",
  "Assessing novelty signals",
  "Building research plan",
];

const EXAMPLE = {
  research_idea: "I want to develop a lightweight blockchain-based federated intrusion detection system for resource-constrained IoT devices.",
  domain: "IoT Security",
  target_problem: "Trustworthy intrusion detection for resource-constrained edge environments",
  proposed_method: "Federated intrusion detection with a lightweight blockchain trust layer",
  constraints: "limited compute, real-time inference, low latency, edge deployment",
};

const levelStyles: Record<string, string> = {
  high: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  low: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

function normalizeLevel(level: string | undefined) {
  const value = String(level || "medium").toLowerCase();
  return value === "high" || value === "low" ? value : "medium";
}

function getBarWidth(level: string | undefined) {
  switch (normalizeLevel(level)) {
    case "high":
      return "90%";
    case "medium":
      return "58%";
    default:
      return "26%";
  }
}

function renderList(items: string[]) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={`${item}-${idx}`} className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <span className="font-mono text-[10px] text-cyan-300 shrink-0 mt-0.5">{String(idx + 1).padStart(2, "0")}</span>
          <span className="text-xs leading-relaxed text-zinc-300">{item}</span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#101115]/90 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
        {icon}
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.24em] text-zinc-200">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function IdeaValidatorTab() {
  const { papers } = useUpload();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("rgpt_idea_selected_ids");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [researchIdea, setResearchIdea] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("rgpt_idea_text") || "";
    }
    return "";
  });
  const [domain, setDomain] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("rgpt_idea_domain") || "";
    }
    return "";
  });
  const [targetProblem, setTargetProblem] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("rgpt_idea_target_problem") || "";
    }
    return "";
  });
  const [proposedMethod, setProposedMethod] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("rgpt_idea_proposed_method") || "";
    }
    return "";
  });
  const [constraints, setConstraints] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("rgpt_idea_constraints") || "";
    }
    return "";
  });
  const [result, setResult] = useState<IdeaValidationResult | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("rgpt_idea_result");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("rgpt_idea_text", researchIdea);
        sessionStorage.setItem("rgpt_idea_domain", domain);
        sessionStorage.setItem("rgpt_idea_target_problem", targetProblem);
        sessionStorage.setItem("rgpt_idea_proposed_method", proposedMethod);
        sessionStorage.setItem("rgpt_idea_constraints", constraints);
        sessionStorage.setItem("rgpt_idea_selected_ids", JSON.stringify(selectedIds));
        if (result) {
          sessionStorage.setItem("rgpt_idea_result", JSON.stringify(result));
        }
      } catch {}
    }
  }, [researchIdea, domain, targetProblem, proposedMethod, constraints, selectedIds, result]);

  const defaultSelectedIds = useMemo(
    () => papers.slice(0, Math.min(5, papers.length)).map((paper) => paper.id),
    [papers]
  );
  const effectiveSelectedIds = selectedIds.length > 0 ? selectedIds : defaultSelectedIds;

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  const indexedCount = useMemo(
    () => papers.filter((paper) => paper.status === "indexed").length,
    [papers]
  );

  const handleTogglePaper = (id: string) => {
    setSelectedIds((prev) => {
      const current = prev.length > 0 ? prev : defaultSelectedIds;
      if (current.includes(id)) return current.filter((paperId) => paperId !== id);
      if (current.length >= 5) return current;
      return [...current, id];
    });
  };

  const handleTryExample = () => {
    setResearchIdea(EXAMPLE.research_idea);
    setDomain(EXAMPLE.domain);
    setTargetProblem(EXAMPLE.target_problem);
    setProposedMethod(EXAMPLE.proposed_method);
    setConstraints(EXAMPLE.constraints);
  };

  const handleValidate = async () => {
    if (!researchIdea.trim()) {
      setError("Please enter a research idea before running the validator.");
      return;
    }
    if (effectiveSelectedIds.length === 0) {
      setError("Select at least one indexed paper for a corpus-based assessment.");
      return;
    }

    setError(null);
    setResult(null);
    setActiveStage(0);
    setIsLoading(true);

    try {
      const data = await api.validateIdea({
        paper_ids: effectiveSelectedIds,
        research_idea: researchIdea.trim(),
        domain: domain.trim() || undefined,
        target_problem: targetProblem.trim() || undefined,
        proposed_method: proposedMethod.trim() || undefined,
        constraints: constraints
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setResult(data as IdeaValidationResult);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to validate the research idea. Please retry.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const content = [
      "# Research Idea Validator",
      "",
      `Idea: ${result.idea}`,
      "",
      `Corpus Summary: ${result.corpus_summary}`,
      "",
      "## Potential Contribution",
      result.potential_contribution,
      "",
      "## Research Questions",
      ...result.research_questions.map((question, idx) => `${idx + 1}. ${question}`),
      "",
      "## Hypothesis",
      `H1: ${result.hypothesis.h1}`,
      `H0: ${result.hypothesis.h0}`,
    ].join("\n");
    navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (papers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#050607]/50 p-6 text-center">
        <FlaskConical className="mx-auto mb-3 h-9 w-9 text-zinc-600" />
        <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-300">Idea Validator</h3>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
          Upload and index papers first so the validator can assess your idea against grounded literature evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="overflow-hidden rounded-[26px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,_rgba(10,12,16,0.96),_rgba(7,8,11,0.96))] shadow-[0_20px_55px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.28em] text-cyan-300">
            <FlaskConical className="h-3.5 w-3.5" />
            Research Idea Validator
          </div>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-300">
            Stress-test your research idea against your literature.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <textarea
            value={researchIdea}
            onChange={(event) => setResearchIdea(event.target.value)}
            placeholder="Describe the research idea you want to validate..."
            className="min-h-32 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />

          <div className="grid grid-cols-1 gap-3">
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="Research Domain"
              className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/60"
            />
            <input
              value={targetProblem}
              onChange={(event) => setTargetProblem(event.target.value)}
              placeholder="Target Problem"
              className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/60"
            />
            <input
              value={proposedMethod}
              onChange={(event) => setProposedMethod(event.target.value)}
              placeholder="Proposed Method"
              className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/60"
            />
            <input
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Constraints: limited compute, real-time inference, privacy..."
              className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/60"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-300">
                Corpus Selection
              </h4>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-mono text-cyan-300">
                {effectiveSelectedIds.length}/5 selected
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Assessment based on the {indexedCount} papers currently indexed in your ResearchGPT workspace.
            </p>
            <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1 no-scrollbar">
              {papers
                .filter((paper) => paper.status === "indexed")
                .map((paper) => {
                  const selected = effectiveSelectedIds.includes(paper.id);
                  const disabled = !selected && effectiveSelectedIds.length >= 5;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => !disabled && handleTogglePaper(paper.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-500/12 text-white"
                          : disabled
                          ? "cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-zinc-600"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-300 hover:border-white/[0.14] hover:text-white"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0 text-cyan-400">
                        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-zinc-600" />}
                      </span>
                      <span className="text-xs leading-snug">{paper.title}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isLoading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3 text-xs font-mono font-bold uppercase tracking-[0.2em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Validating..." : "Validate Research Idea"}
            </button>
            <button
              type="button"
              onClick={handleTryExample}
              className="rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-xs font-mono uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/[0.18] hover:text-white"
            >
              Try an example
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-red-400" />
          <p className="mt-2 text-xs font-mono text-red-300">{error}</p>
        </div>
      )}

      {isLoading && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#0d0f13] p-4">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.24em] text-cyan-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Corpus Analysis
          </div>
          <div className="mt-4 space-y-3">
            {LOADING_STAGES.map((stage, index) => {
              const complete = index < activeStage;
              const current = index === activeStage;
              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
                    current
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : complete
                      ? "border-emerald-500/20 bg-emerald-500/8"
                      : "border-white/[0.05] bg-white/[0.02]"
                  }`}
                >
                  <span className="shrink-0">
                    {complete ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    ) : (
                      <span className="block h-2.5 w-2.5 rounded-full bg-zinc-600" />
                    )}
                  </span>
                  <span className={`text-xs ${current ? "text-white" : "text-zinc-400"}`}>{stage}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isLoading && !result && !error && (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 p-6 text-center">
          <Radar className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-xs font-mono text-zinc-500">
            Validate an idea to see existing work, overlap, novelty signals, gaps, contribution opportunities, and a grounded experiment plan.
          </p>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.24em] text-cyan-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Corpus-Based Assessment
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">{result.corpus_summary}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyReport}
                className="shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-300 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-300">
                {effectiveSelectedIds.length} papers analyzed
              </span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-300">
                {result.evidence_quality}
              </span>
            </div>
          </div>

          <SectionCard title="Existing Work" icon={<BookOpenCheck className="h-3.5 w-3.5 text-cyan-400" />}>
            <div className="space-y-3">
              {result.existing_work.map((item) => (
                <div key={`${item.paper_id}-${item.paper_title}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{item.paper_title}</h4>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-300">{item.existing_contribution}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-mono uppercase ${levelStyles[normalizeLevel(item.relevance)]}`}>
                      {normalizeLevel(item.relevance)}
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/20 p-3">
                    <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-400">Overlap With Your Idea</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">{item.overlap_with_idea}</p>
                    {item.evidence_pages.length > 0 && (
                      <p className="mt-2 text-[11px] text-cyan-300">
                        Evidence pages: {item.evidence_pages.map((page) => `p.${page}`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Overlap Map" icon={<Target className="h-3.5 w-3.5 text-emerald-400" />}>
            <div className="space-y-4">
              {Object.entries(result.overlap_analysis).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono uppercase tracking-[0.14em] text-zinc-300">{key}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase ${levelStyles[normalizeLevel(value.level)]}`}>
                      {normalizeLevel(value.level)}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-white/[0.05]">
                    <div
                      className={`h-2.5 rounded-full ${
                        normalizeLevel(value.level) === "high"
                          ? "bg-emerald-400"
                          : normalizeLevel(value.level) === "medium"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                      style={{ width: getBarWidth(value.level) }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{value.rationale}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Evidence-Based Novelty Signals" icon={<Sparkles className="h-3.5 w-3.5 text-purple-400" />}>
            <div className="space-y-3">
              {result.novelty_signals.map((signal) => (
                <div key={signal.dimension} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">{signal.dimension}</h4>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase ${levelStyles[normalizeLevel(signal.signal)]}`}>
                      {normalizeLevel(signal.signal)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{signal.rationale}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Research Gap Radar" icon={<Lightbulb className="h-3.5 w-3.5 text-amber-400" />}>
            <div className="space-y-3">
              {result.research_gaps.map((gap, idx) => (
                <div key={`${gap.gap}-${idx}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{gap.gap}</h4>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-300">{gap.why_it_matters}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-mono uppercase text-zinc-300">
                        {gap.type}
                      </span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase ${levelStyles[normalizeLevel(gap.confidence)]}`}>
                        {normalizeLevel(gap.confidence)} confidence
                      </span>
                    </div>
                  </div>
                  {gap.supporting_papers.length > 0 && (
                    <p className="mt-3 text-[11px] text-cyan-300">
                      Supporting papers: {gap.supporting_papers.join(", ")}
                    </p>
                  )}
                  {gap.evidence.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {gap.evidence.map((item, evidenceIdx) => (
                        <div key={`${item}-${evidenceIdx}`} className="rounded-xl border border-white/[0.05] bg-black/20 p-3 text-xs italic leading-relaxed text-zinc-400">
                          &quot;{item}&quot;
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Where Your Idea Could Contribute" icon={<ArrowRight className="h-3.5 w-3.5 text-cyan-400" />}>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-4">
              <p className="text-sm leading-relaxed text-zinc-100">{result.potential_contribution}</p>
            </div>
            <div className="mt-4">
              <p className="mb-3 text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
                Potential Contributions
              </p>
              {renderList(result.potential_contributions)}
            </div>
          </SectionCard>

          <SectionCard title="Research Questions" icon={<ClipboardList className="h-3.5 w-3.5 text-cyan-400" />}>
            {renderList(result.research_questions)}
          </SectionCard>

          <SectionCard title="Hypothesis" icon={<FlaskConical className="h-3.5 w-3.5 text-emerald-400" />}>
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-300">H1</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-100">{result.hypothesis.h1}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-400">H0</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">{result.hypothesis.h0}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Experiment Blueprint" icon={<Radar className="h-3.5 w-3.5 text-purple-400" />}>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Dataset</p>
                <div className="mt-2">{renderList(result.experiment_blueprint.dataset)}</div>
              </div>
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Baseline Path</p>
                <div className="mt-2">{renderList(result.experiment_blueprint.baselines)}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Proposed Method</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-200">{result.experiment_blueprint.proposed_method}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Experimental Setup</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-200">{result.experiment_blueprint.experimental_setup}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Variables</p>
                <div className="mt-2">{renderList(result.experiment_blueprint.variables)}</div>
              </div>
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Evaluation Metrics</p>
                <div className="mt-2">{renderList(result.experiment_blueprint.evaluation_metrics)}</div>
              </div>
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Ablation Study</p>
                <div className="mt-2">{renderList(result.experiment_blueprint.ablation_study)}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">Expected Comparison</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-200">{result.experiment_blueprint.expected_comparison}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Baselines" icon={<Target className="h-3.5 w-3.5 text-rose-400" />}>
            <div className="space-y-3">
              {result.baselines.map((item, idx) => (
                <div key={`${item.baseline}-${idx}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">{item.baseline}</h4>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-mono uppercase text-zinc-300">
                      {item.paper}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{item.why_it_matters}</p>
                  <p className="mt-2 text-xs italic leading-relaxed text-zinc-400">&quot;{item.evidence}&quot;</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Supporting Citations" icon={<BookOpenCheck className="h-3.5 w-3.5 text-cyan-400" />}>
            <div className="space-y-3">
              {result.citations.map((citation, idx) => (
                <div key={`${citation.paper_title}-${citation.page}-${idx}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">{citation.paper_title}</h4>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-mono uppercase text-cyan-300">
                      p.{citation.page}
                    </span>
                  </div>
                  <p className="mt-2 text-xs italic leading-relaxed text-zinc-400">&quot;{citation.snippet}&quot;</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
