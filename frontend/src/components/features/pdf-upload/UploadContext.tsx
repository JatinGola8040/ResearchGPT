"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { api } from '../../../lib/api';

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
  author?: string;
  authors?: string;
  year?: string | number;
  abstract?: string;
  [key: string]: unknown;
}

interface UploadContextType {
  papers: Paper[];
  uploads: UploadItem[];
  uploadFile: (file: File) => void;
  removeUpload: (id: string) => void;
  refreshPapers: () => void;
  deletePaper: (id: string) => void;
  isLoadingPapers: boolean;
  selectedPaperId: string | null;
  setSelectedPaperId: (id: string | null) => void;
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
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const refreshPapers = useCallback(async () => {
    setIsLoadingPapers(true);
    try {
      const data = await api.getPapers();
      
      let parsedPapers: Paper[] = [];
      if (Array.isArray(data)) {
        parsedPapers = data;
      } else if (data && Array.isArray(data.papers)) {
        parsedPapers = data.papers;
      } else if (data && Array.isArray(data.data)) {
        parsedPapers = data.data;
      } else {
        console.warn("Unexpected API response format for papers:", data);
        parsedPapers = [];
      }
      
      setPapers(parsedPapers);
    } catch (error) {
      console.error("Error fetching papers:", error);
      setPapers([]); // Fallback to empty array on error to prevent crashes
    } finally {
      setIsLoadingPapers(false);
    }
  }, []);

  useEffect(() => {
    refreshPapers();
  }, [refreshPapers]);

  const deletePaper = async (id: string) => {
    try {
      await api.deletePaper(id);
      alert("Paper deleted successfully.");
      refreshPapers();
    } catch (error) {
      console.error("Error deleting paper:", error);
      alert("Failed to delete paper. Please try again.");
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
    xhr.open('POST', api.getUploadUrl());

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
    <UploadContext.Provider value={{ papers, uploads, uploadFile, removeUpload, refreshPapers, deletePaper, isLoadingPapers, selectedPaperId, setSelectedPaperId }}>
      {children}
    </UploadContext.Provider>
  );
}
