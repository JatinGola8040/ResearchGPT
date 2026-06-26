"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import { useUpload } from "./UploadContext";

export function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => uploadFile(file));
      // Reset input so the same file can be uploaded again if needed
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
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="btn btn-primary w-full gap-2 py-3 shadow-[0_0_10px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)]"
      >
        <Upload className="w-4 h-4" />
        Upload PDFs
      </button>
    </>
  );
}
