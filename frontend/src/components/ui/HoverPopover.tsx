"use client";

import { ReactNode, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface HoverPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
}

/**
 * Hover-triggered white popover card (150ms open delay, positioned above the
 * trigger, rendered in a fixed portal layer so it never shifts layout).
 * Keyboard focus opens it too (a11y).
 */
export function HoverPopover({ trigger, children }: HoverPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPos({
          left: Math.min(Math.max(12, rect.left + rect.width / 2), window.innerWidth - 180),
          top: rect.top,
        });
        setOpen(true);
      }
    }, 150);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-[#397F70]/45 rounded"
    >
      {trigger}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={clearTimers}
              onMouseLeave={scheduleClose}
              className="fixed z-[100] max-w-sm w-80 -translate-x-1/2 -translate-y-full pb-2"
              style={{ left: pos.left, top: pos.top }}
            >
              <div className="bg-white border border-[#EAE9EA] rounded-2xl shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)] p-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
}
