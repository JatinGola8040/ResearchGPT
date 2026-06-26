"use client";

import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { useUpload } from "./UploadContext";

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
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group
          ${isDragging ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : 'border-border hover:border-primary hover:bg-surface-elevated hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]'}
        `}
      >
        <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-primary/20' : 'bg-surface-elevated group-hover:bg-primary/20'}`}>
          <FileUp className={`w-6 h-6 transition-colors ${isDragging ? 'text-primary' : 'text-muted group-hover:text-primary'}`} />
        </div>
        <p className="text-sm font-medium text-foreground">Drag & drop PDFs here</p>
        <p className="text-xs text-muted mt-1">or click to browse files</p>
      </div>
    </>
  );
}
