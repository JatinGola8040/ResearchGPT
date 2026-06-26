import { useEffect, useState } from "react";
import { useUpload } from "../pdf-upload/UploadContext";
import { api } from "../../../lib/api";
import { Loader2, AlertCircle, FileText } from "lucide-react";

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
        
        // Safely map the backend response allowing standard variations
        setSummary({
          executive_summary: data.executive_summary || data.summary || "No executive summary provided.",
          key_contributions: Array.isArray(data.key_contributions) ? data.key_contributions : [],
          methodology: data.methodology || "No methodology detailed.",
          results: data.results || "No results detailed.",
          limitations: data.limitations || "No limitations detailed."
        });
      } catch (err) {
        console.error("Failed to load summary:", err);
        setError("Failed to generate summary. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [selectedPaperId]);

  if (!selectedPaperId) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-border bg-transparent">
        <FileText className="w-10 h-10 text-muted mb-4 opacity-50" />
        <h3 className="text-sm font-medium text-foreground mb-2">Summary View</h3>
        <p className="text-xs text-muted">
          Select a paper from the left sidebar to see its auto-generated insights here.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted">Generating comprehensive summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4 pb-6">
      <div className="card p-4 bg-surface-elevated border-border">
        <h3 className="text-sm font-semibold text-primary mb-2">Executive Summary</h3>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{summary.executive_summary}</p>
      </div>

      {summary.key_contributions && summary.key_contributions.length > 0 && (
        <div className="card p-4 bg-surface-elevated border-border">
          <h3 className="text-sm font-semibold text-primary mb-2">Key Contributions</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            {summary.key_contributions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-4 bg-surface-elevated border-border">
        <h3 className="text-sm font-semibold text-primary mb-2">Methodology</h3>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{summary.methodology}</p>
      </div>

      <div className="card p-4 bg-surface-elevated border-border">
        <h3 className="text-sm font-semibold text-primary mb-2">Results</h3>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{summary.results}</p>
      </div>

      <div className="card p-4 bg-surface-elevated border-border">
        <h3 className="text-sm font-semibold text-primary mb-2">Limitations</h3>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{summary.limitations}</p>
      </div>
    </div>
  );
}
