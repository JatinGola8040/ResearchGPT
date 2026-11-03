"use client";

import { Upload, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useUpload } from "./UploadContext";
import { motion } from "framer-motion";

export function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => uploadFile(file));
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3.5 px-4 rounded-xl bg-[#397F70] hover:bg-[#2C6659] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-md transition-all cursor-pointer"
      >
        <Upload className="w-4 h-4 animate-bounce" />
        <span>Upload PDF Manuscripts</span>
        <Sparkles className="w-3.5 h-3.5 text-[#397F70]" />
      </motion.button>
    </>
  );
}
