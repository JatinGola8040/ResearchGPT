"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

type UploadState = 'uploading' | 'completed' | 'failed';

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  state: UploadState;
  errorMessage?: string;
}

export interface Paper {
  id: string;
  title: string;
  status: 'ready' | 'processing' | string;
  uploaded_at?: string;
}

interface UploadContextType {
  papers: Paper[];
  uploads: UploadItem[];
  uploadFile: (file: File) => void;
  removeUpload: (id: string) => void;
  refreshPapers: () => void;
  deletePaper: (id: string) => void;
  isLoadingPapers: boolean;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);

  const refreshPapers = useCallback(async () => {
    setIsLoadingPapers(true);
    try {
      const response = await fetch('/papers');
      if (response.ok) {
        const data = await response.json();
        // Assume API returns an array or an object with a papers array
        setPapers(data.papers || data);
      } else {
        console.error("Failed to fetch papers:", response.status);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    } finally {
      setIsLoadingPapers(false);
    }
  }, []);

  useEffect(() => {
    refreshPapers();
  }, [refreshPapers]);

  const deletePaper = async (id: string) => {
    try {
      const response = await fetch(`/papers/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        refreshPapers();
      } else {
        console.error("Failed to delete paper:", response.status);
      }
    } catch (error) {
      console.error("Error deleting paper:", error);
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const uploadFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("Invalid file type. Please select a PDF file.");
      return;
    }

    const uploadId = Date.now().toString();
    const newUpload: UploadItem = {
      id: uploadId,
      filename: file.name,
      progress: 0,
      state: 'uploading'
    };

    setUploads(prev => [newUpload, ...prev]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/papers/upload');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: percentComplete } : u
        ));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 100, state: 'completed' } : u
        ));
        
        refreshPapers();
      } else {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, state: 'failed', errorMessage: `Server error: ${xhr.status}` } : u
        ));
      }
    };

    xhr.onerror = () => {
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, state: 'failed', errorMessage: 'Network Error: Failed to reach server' } : u
      ));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  };

  return (
    <UploadContext.Provider value={{ papers, uploads, uploadFile, removeUpload, refreshPapers, deletePaper, isLoadingPapers }}>
      {children}
    </UploadContext.Provider>
  );
}
