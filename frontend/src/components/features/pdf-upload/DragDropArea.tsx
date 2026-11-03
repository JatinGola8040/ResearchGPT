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
            ? 'border-[#397F70] bg-[#397F70]/20 scale-105 shadow-md' 
            : 'border-[#EAE9EA] bg-[#FBFCFC]/80 hover:border-[#397F70]/80 hover:bg-[#E8F2EE] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]'}
        `}
      >
        <div className={`p-3 rounded-2xl mb-3 transition-all duration-300 border ${
          isDragging 
            ? 'bg-[#397F70]/30 border-[#397F70] text-[#397F70] scale-125 shadow-lg' 
            : 'bg-white/[0.04] border-[#EAE9EA] text-[#585254] group-hover:text-[#397F70] group-hover:border-[#397F70]/40 group-hover:scale-110 group-hover:shadow-md'
        }`}>
          <FileUp className="w-6 h-6" />
        </div>
        
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#251F21] group-hover:text-[#251F21] transition-colors">
          <span>Drop PDF manuscripts here</span>
          <Sparkles className="w-3.5 h-3.5 text-[#397F70] opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </div>
        <p className="text-[10px] text-[#585254] font-mono mt-1">or click to browse filesystem</p>
      </motion.div>
    </>
  );
}
