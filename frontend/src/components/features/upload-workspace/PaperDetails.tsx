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
        <div className="studio-card p-6 md:p-8 space-y-6 bg-white border-[#EAE9EA] shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#397F70]/10 border border-[#397F70]/30 text-[#397F70] text-xs font-mono font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>ACTIVE LITERATURE REPOSITORY</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-full text-[#251F21] font-mono text-xs border border-[#EAE9EA]">
                <Database className="w-3 h-3 text-[#397F70]" /> Vector 768d Embeddings
              </span>
              <span className="flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-full text-[#251F21] font-mono text-xs border border-[#EAE9EA]">
                <Layers className="w-3 h-3 text-[#8469AE]" /> {pageCount} Pages
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#23825A] font-mono bg-[#23825A]/10 px-2.5 py-1 rounded-full border border-[#23825A]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>✓ Indexed</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-[#251F21] tracking-tight leading-tight">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm text-[#585254] border-t border-[#EAE9EA] pt-5 font-mono">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#8469AE]" />
              <span className="text-[#251F21]">{author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8469AE]" />
              <span className="text-[#251F21]">{year}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-[#397F70]" />
              <span className="text-[#251F21]">Parsed PDF Chunk</span>
            </div>
          </div>
        </div>

        {/* Abstract Section */}
        <div className="studio-card p-6 md:p-8 space-y-4 bg-white">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#251F21]">
            <Sparkles className="w-4 h-4 text-[#397F70]" />
            <span>Executive Abstract Synthesis</span>
          </div>
          <p className="text-[#251F21] leading-relaxed text-sm md:text-base font-serif italic border-l-2 border-[#397F70]/50 pl-4 py-1">
            &quot;{abstract}&quot;
          </p>
        </div>

        {/* Extracted Concepts */}
        <div className="studio-card p-6 md:p-8 space-y-4 bg-white">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#251F21]">
            <Tag className="w-4 h-4 text-[#8469AE]" />
            <span>Extracted Semantic Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Transformer Architecture", "Self-Attention Mechanism", "Neural Machine Translation", "Deep Learning", "Context Representation"].map((tag) => (
              <span key={tag} className="px-3.5 py-1.5 bg-[#FBFCFC] border border-[#EAE9EA] hover:border-[#397F70]/40 transition-all duration-200 rounded-lg text-xs font-mono font-medium text-[#397F70] shadow-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
