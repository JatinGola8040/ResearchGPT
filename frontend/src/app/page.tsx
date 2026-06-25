"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BrainCircuit, FileSearch, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
      
      <main className="z-10 flex flex-col items-center text-center px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 mb-8"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">Introducing ResearchGPT</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Accelerate your <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            research workflow
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl"
        >
          Upload papers, chat with your data, and discover literature gaps all in one unified AI workspace. Built for modern researchers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link href="/workspace">
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-50 text-slate-950 font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">
                Start Research
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
              {/* Button hover glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Inner text change on hover for contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-multiply" />
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
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="p-3 bg-slate-800 rounded-xl mb-4 text-cyan-400">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
