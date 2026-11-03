import { Sparkles, ShieldCheck, Cpu, Zap, ArrowRight, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export function WelcomeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative z-10 overflow-y-auto no-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center max-w-3xl w-full"
      >
        {/* Central Hero Crest */}
        <div className="relative mb-6">
                    <div className="relative w-20 h-20 rounded-2xl bg-white border border-[#EAE9EA] flex items-center justify-center shadow-md">
            <Sparkles className="w-10 h-10 text-[#397F70] drop-shadow-md" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#EAE9EA] text-xs font-mono text-[#397F70] mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#397F70] animate-ping" />
          NEXT-GEN LITERATURE INTELLIGENCE
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#251F21] tracking-tight max-w-xl leading-tight mb-4">
          Synthesize Knowledge with <span className="neon-gradient-text">ResearchGPT Studio</span>
        </h1>
        
        <p className="text-[#585254] max-w-lg mx-auto mb-8 text-sm sm:text-base leading-relaxed">
          Upload academic papers or technical documentation on the left sidebar to unlock grounded reasoning, deep comparative analysis, and automated literature synthesis.
        </p>

        {/* Suggested Starter Prompts */}
        <div className="mb-10 w-full max-w-xl">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[#585254] mb-3 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span>Suggested Research Starters</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "Synthesize methodology contrasts across all uploaded papers",
              "Identify key limitations and future research directions",
              "Extract benchmark results and empirical validation metrics"
            ].map((prompt, idx) => (
              <div 
                key={idx}
                className="px-3.5 py-2 rounded-xl bg-[#FBFCFC]/90 border border-[#EAE9EA] text-xs text-[#251F21] flex items-center gap-2 shadow-sm"
              >
                <span>&quot;{prompt}&quot;</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <motion.div whileHover={{ y: -3 }} className="studio-card p-5 space-y-2 bg-white backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-[#397F70]/10 border border-[#397F70]/20 flex items-center justify-center text-[#397F70] mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#251F21]">Grounded Citations</h3>
            <p className="text-xs text-[#585254] leading-relaxed">Every AI assertion maps directly to exact page snippets and PDF bounding boxes.</p>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="studio-card p-5 space-y-2 bg-white backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-[#8469AE]/10 border border-[#8469AE]/20 flex items-center justify-center text-[#8469AE] mb-2">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#251F21]">Multi-Paper Synthesis</h3>
            <p className="text-xs text-[#585254] leading-relaxed">Compare conflicting findings and discover cross-paper research gaps instantly.</p>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="studio-card p-5 space-y-2 bg-white backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-[#8469AE]/10 border border-[#8469AE]/20 flex items-center justify-center text-[#8469AE] mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#251F21]">Qwen 3.6 Engine</h3>
            <p className="text-xs text-[#585254] leading-relaxed">Powered by high-reasoning context models for academic-grade precision.</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
