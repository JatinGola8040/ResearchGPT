"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbit, Loader2, ExternalLink, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { api } from "../../../lib/api";
import { useUpload } from "../pdf-upload/UploadContext";
import { EvidenceDrawer } from "../../ui/EvidenceDrawer";

interface GalaxyPoint {
  paper_id: string;
  title: string;
  x: number;
  y: number;
  n_chunks: number;
}

interface GalaxyEdge {
  source_paper_id: string;
  target_paper_id: string;
  similarity: number;
}

interface GalaxyResponse {
  points: GalaxyPoint[];
  edges: GalaxyEdge[];
  citation_links: { source_paper_id: string; target_paper_id: string }[];
}

interface GhostNode {
  title: string;
  year: number | null;
  citation_count: number | null;
  url: string | null;
  abstract: string | null;
}

interface DragState {
  mode: "pan" | "node";
  nodeId?: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export function PaperGalaxyView({ onOpenInInspector }: { onOpenInInspector: (paperId: string) => void }) {
  const { papers } = useUpload();
  const [data, setData] = useState<GalaxyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GalaxyPoint | null>(null);
  const [discoveryOn, setDiscoveryOn] = useState(false);
  const [ghosts, setGhosts] = useState<GhostNode[]>([]);
  const [ghostsLoading, setGhostsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Pan/zoom state: viewBox of the SVG
  const [view, setView] = useState({ x: -500, y: -400, w: 1000, h: 800 });
  const [draggedNodes, setDraggedNodes] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGalaxy()
      .then((res: GalaxyResponse) => {
        if (!cancelled) {
          setData(res);
          if (res.points.length > 0) {
            const xs = res.points.map((p) => p.x);
            const ys = res.points.map((p) => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const pad = 1.2;
            const w = Math.max(maxX - minX, 0.5) * pad * 2;
            const h = Math.max(maxY - minY, 0.5) * pad * 2;
            setView({ x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h });
          }
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [papers.length]);

  const posOf = useCallback(
    (p: GalaxyPoint) => draggedNodes[p.paper_id] || { x: p.x, y: p.y },
    [draggedNodes]
  );

  const toSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: view.x + ((clientX - rect.left) / rect.width) * view.w,
        y: view.y + ((clientY - rect.top) / rect.height) * view.h,
      };
    },
    [view]
  );

  const zoom = useCallback((factor: number) => {
    setView((v) => {
      const nw = Math.min(Math.max(v.w * factor, 0.2), 50);
      const nh = Math.min(Math.max(v.h * factor, 0.16), 40);
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      zoom(e.deltaY > 0 ? 1.15 : 0.87);
    },
    [zoom]
  );

  const onBackgroundMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { mode: "pan", startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y };
  };

  const onNodeMouseDown = (e: React.MouseEvent, p: GalaxyPoint) => {
    e.stopPropagation();
    const pos = posOf(p);
    const svg = toSvgCoords(e.clientX, e.clientY);
    dragRef.current = { mode: "node", nodeId: p.paper_id, startX: svg.x, startY: svg.y, origX: pos.x, origY: pos.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "pan") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((e.clientX - drag.startX) / rect.width) * view.w;
      const dy = ((e.clientY - drag.startY) / rect.height) * view.h;
      setView((v) => ({ ...v, x: drag.origX - dx, y: drag.origY - dy }));
    } else if (drag.nodeId) {
      const svg = toSvgCoords(e.clientX, e.clientY);
      setDraggedNodes((prev) => ({
        ...prev,
        [drag.nodeId!]: { x: drag.origX + (svg.x - drag.startX), y: drag.origY + (svg.y - drag.startY) },
      }));
    }
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  // Discovery ghost nodes: fetch for each point once (sequentially, cached server-side)
  useEffect(() => {
    if (!discoveryOn || !data) return;
    let cancelled = false;
    setGhostsLoading(true);
    (async () => {
      const all: GhostNode[] = [];
      for (const p of data.points.slice(0, 4)) {
        if (cancelled) return;
        try {
          const res = await api.getGalaxyDiscovery(p.paper_id);
          all.push(...(res.ghost_nodes || []));
        } catch {
          if (!cancelled) setToast("Discovery service unavailable right now - showing what we have.");
        }
      }
      if (!cancelled) {
        setGhosts(all);
        setGhostsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discoveryOn, data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Ghost node placement: ring around the centroid
  const ghostPositions = useMemo(() => {
    if (!data || data.points.length === 0 || ghosts.length === 0) return [];
    const cx = data.points.reduce((s, p) => s + posOf(p).x, 0) / data.points.length;
    const cy = data.points.reduce((s, p) => s + posOf(p).y, 0) / data.points.length;
    const radius = Math.max(view.w, view.h) * 0.32;
    return ghosts.map((g, i) => {
      const angle = (2 * Math.PI * i) / ghosts.length;
      return { ghost: g, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }, [ghosts, data, view.w, view.h, posOf]);

  const selectedPaper = selectedPoint ? papers.find((p) => p.id === selectedPoint.paper_id) : null;
  const nodeRadius = (p: GalaxyPoint) => Math.max(0.02, Math.min(0.08, 0.02 + p.n_chunks * 0.0004)) * view.w * 0.5;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-full max-w-3xl h-96 rounded-2xl animate-shimmer" />
        <Loader2 className="w-6 h-6 animate-spin text-[#397F70]" />
        <p className="text-xs font-mono text-[#585254]">Projecting your library into 2D...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[#C3424D]/30 bg-[#FBECEE] p-6 max-w-md text-center">
          <p className="text-sm font-semibold text-[#C3424D]">Could not build the galaxy</p>
          <p className="text-xs text-[#585254] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Floating view header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="absolute top-16 left-5 z-10 rounded-2xl bg-white border border-[#EAE9EA] shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)] p-4 max-w-xs">
        <h2 className="text-xl font-bold text-[#251F21] flex items-center gap-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <Orbit className="w-5 h-5 text-[#397F70]" />
          Paper Galaxy
        </h2>
        <p className="text-xs text-[#585254] mt-1">Your library as a star map. Similar papers cluster together.</p>
        <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-[#585254] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#397F70]/40 inline-block" /> Similar</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#8469AE] inline-block" /> Cites</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#8469AE] inline-block" /> Discovery</span>
        </div>
      </motion.div>

      {/* Discovery toggle */}
      <div className="absolute top-16 right-5 z-10 flex items-center gap-2">
        <button
          onClick={() => setDiscoveryOn((v) => !v)}
          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
            discoveryOn
              ? "bg-[#F0EAF7] text-[#8469AE] border-[#8469AE]/40"
              : "bg-white text-[#585254] border-[#EAE9EA] hover:border-[#8469AE]/40"
          }`}
        >
          {ghostsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Orbit className="w-3.5 h-3.5" />}
          Discovery {discoveryOn ? "On" : "Off"}
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-1.5">
        <button onClick={() => zoom(0.8)} className="p-2 rounded-lg bg-white border border-[#EAE9EA] shadow-sm text-[#585254] hover:text-[#397F70] cursor-pointer" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={() => zoom(1.25)} className="p-2 rounded-lg bg-white border border-[#EAE9EA] shadow-sm text-[#585254] hover:text-[#397F70] cursor-pointer" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={() => setView({ x: -0.6, y: -0.5, w: 1.2, h: 1 })} className="p-2 rounded-lg bg-white border border-[#EAE9EA] shadow-sm text-[#585254] hover:text-[#397F70] cursor-pointer" aria-label="Fit view"><Maximize className="w-4 h-4" /></button>
      </div>

      {/* Canvas */}
      <div className="flex-1 m-4 mt-14 rounded-2xl bg-[#FBFCFC] border border-[#EAE9EA] overflow-hidden">
        {!data || data.points.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-2xl border border-dashed border-[#EAE9EA] p-8 text-center max-w-sm">
              <Orbit className="w-8 h-8 text-[#585254] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#251F21]">No indexed papers yet</p>
              <p className="text-xs text-[#585254] mt-1">Upload papers to see them on the star map.</p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            onWheel={onWheel}
            onMouseDown={onBackgroundMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Similarity edges */}
            {data.edges.map((e, i) => {
              const a = data.points.find((p) => p.paper_id === e.source_paper_id);
              const b = data.points.find((p) => p.paper_id === e.target_paper_id);
              if (!a || !b) return null;
              const pa = posOf(a);
              const pb = posOf(b);
              const highlighted = hoveredId === a.paper_id || hoveredId === b.paper_id;
              return (
                <line
                  key={`sim-${i}`}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke={highlighted ? "rgba(57,127,112,0.5)" : "rgba(57,127,112,0.18)"}
                  strokeWidth={(highlighted ? 2.5 : 1.5) * (view.w / 1000)}
                />
              );
            })}
            {/* Citation links */}
            {data.citation_links.map((e, i) => {
              const a = data.points.find((p) => p.paper_id === e.source_paper_id);
              const b = data.points.find((p) => p.paper_id === e.target_paper_id);
              if (!a || !b) return null;
              const pa = posOf(a);
              const pb = posOf(b);
              return (
                <line
                  key={`cite-${i}`}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="#8469AE"
                  strokeOpacity={0.7}
                  strokeWidth={1.5 * (view.w / 1000)}
                  strokeDasharray={`${6 * (view.w / 1000)} ${4 * (view.w / 1000)}`}
                />
              );
            })}
            {/* Paper nodes */}
            {data.points.map((p) => {
              const pos = posOf(p);
              const r = nodeRadius(p);
              const isHovered = hoveredId === p.paper_id;
              return (
                <g
                  key={p.paper_id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => onNodeMouseDown(e, p)}
                  onMouseEnter={() => setHoveredId(p.paper_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedPoint(p)}
                  className="cursor-pointer"
                >
                  <circle r={r * 1.8} fill="transparent" />
                  <circle
                    r={r}
                    fill="#397F70"
                    stroke={isHovered || selectedPoint?.paper_id === p.paper_id ? "#251F21" : "#FFFFFF"}
                    strokeWidth={r * 0.15}
                    style={{ filter: "drop-shadow(0 1px 2px rgba(37,31,33,0.3))", transition: "stroke 0.15s" }}
                  />
                  {isHovered && (
                    <text
                      y={r + 0.02 * view.w * 0.5 + r * 0.6}
                      textAnchor="middle"
                      fill="#251F21"
                      fontSize={0.028 * view.w * 0.5}
                      fontWeight={600}
                      style={{ pointerEvents: "none" }}
                    >
                      {p.title.length > 42 ? p.title.slice(0, 42) + "…" : p.title}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Discovery ghost nodes */}
            <AnimatePresence>
              {discoveryOn &&
                ghostPositions.map(({ ghost, x, y }, i) => (
                  <g
                    key={`ghost-${i}`}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => ghost.url && window.open(ghost.url, "_blank", "noopener")}
                    className="cursor-pointer"
                  >
                    <circle
                      r={0.024 * view.w * 0.5}
                      fill="#F0EAF7"
                      stroke="#8469AE"
                      strokeWidth={0.004 * view.w * 0.5}
                      strokeDasharray={`${0.008 * view.w * 0.5} ${0.006 * view.w * 0.5}`}
                    >
                      <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" />
                    </circle>
                    <title>{`${ghost.title}${ghost.year ? ` (${ghost.year})` : ""} - opens Semantic Scholar`}</title>
                  </g>
                ))}
            </AnimatePresence>
          </svg>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-[#251F21] text-white text-xs shadow-md"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node drawer */}
      <EvidenceDrawer
        open={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
        title={selectedPoint?.title || ""}
        subtitle={selectedPoint ? `${selectedPoint.n_chunks} indexed chunks` : undefined}
      >
        {selectedPoint && (
          <div className="space-y-3">
            {selectedPaper?.abstract ? (
              <p className="text-xs text-[#585254] leading-relaxed">{String(selectedPaper.abstract)}</p>
            ) : (
              <p className="text-xs text-[#585254] italic">No abstract stored for this paper.</p>
            )}
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#585254]">
              {selectedPaper?.pages ? <span className="px-2 py-0.5 rounded bg-[#FBFCFC] border border-[#EAE9EA]">{String(selectedPaper.pages)} pages</span> : null}
              <span className="px-2 py-0.5 rounded bg-[#E8F2EE] text-[#397F70]">{selectedPoint.n_chunks} chunks</span>
            </div>
            <button
              onClick={() => onOpenInInspector(selectedPoint.paper_id)}
              className="w-full py-2.5 rounded-xl bg-[#397F70] hover:bg-[#2C6659] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Inspector
            </button>
          </div>
        )}
      </EvidenceDrawer>
    </div>
  );
}
