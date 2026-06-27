"use client";

import { FileUp, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useUpload } from "./UploadContext";
import { motion } from "framer-motion";

export function DragDropArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => uploadFile(file));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => uploadFile(file));
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf" 
        className="hidden" 
        multiple
      />
      <motion.div 
        whileHover={{ scale: 1.01 }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group relative overflow-hidden
          ${isDragging 
            ? 'border-cyan-400 bg-cyan-500/20 scale-105 shadow-[0_0_30px_rgba(56,189,248,0.4)]' 
            : 'border-white/[0.12] bg-[#131418]/80 hover:border-cyan-400/80 hover:bg-[#15161C] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]'}
        `}
      >
        <div className={`p-3 rounded-2xl mb-3 transition-all duration-300 border ${
          isDragging 
            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 scale-125 shadow-lg' 
            : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 group-hover:scale-110 group-hover:shadow-md'
        }`}>
          <FileUp className="w-6 h-6" />
        </div>
        
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
          <span>Drop PDF manuscripts here</span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">or click to browse filesystem</p>
      </motion.div>
    </>
  );
}
