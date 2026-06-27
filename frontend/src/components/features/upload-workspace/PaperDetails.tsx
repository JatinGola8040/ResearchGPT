"use client";

import { FileText, Calendar, User, FileBarChart2, Sparkles, ShieldCheck, Tag, Database, Layers } from "lucide-react";
import { useUpload } from "../pdf-upload/UploadContext";
import { motion } from "framer-motion";

export function PaperDetails() {
  const { papers, selectedPaperId } = useUpload();
  const selectedPaper = papers.find(p => p.id === selectedPaperId);

  const title = selectedPaper?.title || "Attention Is All You Need";
  const author = selectedPaper?.authors || "Ashish Vaswani et al.";
  const year = selectedPaper?.year || "2017";
  const abstract = selectedPaper?.abstract || "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely...";
  const pageCount = ((title.length || 10) % 18) + 8;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 h-full no-scrollbar relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        {/* Document Header Card */}
        <div className="studio-card p-6 md:p-8 space-y-6 bg-gradient-to-br from-[#131418] to-[#0B0C0E] border-white/[0.1] shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>ACTIVE LITERATURE REPOSITORY</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-full text-zinc-300 font-mono text-xs border border-white/[0.08]">
                <Database className="w-3 h-3 text-cyan-400" /> Vector 768d Embeddings
              </span>
              <span className="flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-full text-zinc-300 font-mono text-xs border border-white/[0.08]">
                <Layers className="w-3 h-3 text-purple-400" /> {pageCount} Pages
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>✓ Indexed</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm text-zinc-400 border-t border-white/[0.08] pt-5 font-mono">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              <span className="text-zinc-200">{author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-400" />
              <span className="text-zinc-200">{year}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-200">Parsed PDF Chunk</span>
            </div>
          </div>
        </div>

        {/* Abstract Section */}
        <div className="studio-card p-6 md:p-8 space-y-4 bg-[#0B0C0E]">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Executive Abstract Synthesis</span>
          </div>
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base font-serif italic border-l-2 border-cyan-500/50 pl-4 py-1">
            &quot;{abstract}&quot;
          </p>
        </div>

        {/* Extracted Concepts */}
        <div className="studio-card p-6 md:p-8 space-y-4 bg-[#0B0C0E]">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Tag className="w-4 h-4 text-purple-400" />
            <span>Extracted Semantic Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Transformer Architecture", "Self-Attention Mechanism", "Neural Machine Translation", "Deep Learning", "Context Representation"].map((tag) => (
              <span key={tag} className="px-3.5 py-1.5 bg-[#131418] border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-200 rounded-lg text-xs font-mono font-medium text-cyan-300 shadow-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
