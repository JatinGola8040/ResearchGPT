"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared right-slide evidence drawer (320-360px, white, hairline border-l,
 * spring width animation) used by the Map, Court and Galaxy views.
 */
export function EvidenceDrawer({ open, onClose, title, subtitle, children }: EvidenceDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="shrink-0 h-full bg-white border-l border-[#EAE9EA] overflow-hidden z-20"
        >
          <div className="w-[340px] h-full flex flex-col">
            <div className="flex items-start justify-between gap-2 p-4 border-b border-[#EAE9EA]">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[#251F21] leading-snug">{title}</h3>
                {subtitle && <p className="text-xs text-[#585254] mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#585254] hover:text-[#251F21] hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0"
                aria-label="Close evidence panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {children}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

interface PassageCardProps {
  paperTitle: string;
  page: number | string;
  text: string;
  accent?: "agree" | "contradict" | "partial" | "neutral";
}

const ACCENT_STYLES: Record<string, { badge: string; border: string }> = {
  agree: { badge: "bg-[#E6F4EC] text-[#23825A] border-[#23825A]/30", border: "border-l-[#23825A]" },
  contradict: { badge: "bg-[#FBECEE] text-[#C3424D] border-[#C3424D]/30", border: "border-l-[#C3424D]" },
  partial: { badge: "bg-[#FFF4D9] text-[#A87513] border-[#A87513]/30", border: "border-l-[#A87513]" },
  neutral: { badge: "bg-[#FBFCFC] text-[#585254] border-[#EAE9EA]", border: "border-l-[#397F70]" },
};

/** White passage card with paper title + Pg. N badge (matches Citations-tab badge style). */
export function PassageCard({ paperTitle, page, text, accent = "neutral" }: PassageCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className={`rounded-xl bg-white border border-[#EAE9EA] border-l-[3px] ${styles.border} p-3.5 shadow-sm`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-xs text-[#251F21] line-clamp-2">{paperTitle}</span>
        <span className={`text-[10px] font-mono border px-2 py-0.5 rounded shrink-0 ${styles.badge}`}>
          Pg. {page}
        </span>
      </div>
      <p className="text-xs text-[#585254] leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
