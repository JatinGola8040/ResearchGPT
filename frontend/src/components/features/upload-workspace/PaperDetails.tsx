import { FileText, Calendar, User, FileBarChart2 } from "lucide-react";

export function PaperDetails() {
  return (
    <div className="flex-1 overflow-y-auto p-8 h-full custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 text-primary mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase">Document Overview</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Attention Is All You Need
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted border-b border-border pb-8">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-secondary" />
              <span>Ashish Vaswani et al.</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-secondary" />
              <span>2017</span>
            </div>
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-secondary" />
              <span>15 Pages</span>
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Abstract
          </h3>
          <p className="text-muted leading-relaxed text-base">
            The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely...
          </p>
        </div>

        {/* Key Entities / Extracted Metadata */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Extracted Concepts</h3>
          <div className="flex flex-wrap gap-2">
            {["Transformer", "Self-Attention", "Machine Translation", "BLEU Score", "Sequence Transduction"].map((tag) => (
              <span key={tag} className="px-4 py-1.5 bg-surface-elevated border border-border hover:border-primary/50 transition-colors rounded-full text-xs font-medium text-primary shadow-sm cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
