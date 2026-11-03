"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BrainCircuit, FileSearch, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4EFEC] text-[#251F21] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#397F70]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#8469AE]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <main className="z-10 flex flex-col items-center text-center px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#EAE9EA] shadow-sm mb-8"
        >
          <Sparkles className="w-4 h-4 text-[#397F70]" />
          <span className="text-sm font-medium text-[#585254]">Introducing ResearchGPT</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Accelerate your <br className="hidden md:block" />
          <span className="text-[#397F70]">
            research workflow
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-[#585254] mb-10 max-w-2xl"
        >
          Upload papers, chat with your data, and discover literature gaps all in one unified AI workspace. Built for modern researchers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link href="/workspace">
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#397F70] text-white hover:bg-[#2C6659] font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">
                Start Research
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full"
        >
          {[
            { icon: FileSearch, title: "Deep Analysis", desc: "Instantly summarize and extract key findings from multiple PDFs." },
            { icon: BrainCircuit, title: "AI Assistant", desc: "Chat with an AI that understands the exact context of your uploaded papers." },
            { icon: Zap, title: "Find Gaps", desc: "Automatically generate literature reviews and identify research gaps." }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-white border border-[#EAE9EA] hover:border-[#397F70]/40 shadow-sm transition-colors">
              <div className="p-3 bg-[#E8F2EE] rounded-xl mb-4 text-[#397F70]">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[#585254]">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
