"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { Waypoints, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import { useUpload } from "../pdf-upload/UploadContext";
import { EvidenceDrawer, PassageCard } from "../../ui/EvidenceDrawer";

interface MapNode {
  paper_id: string;
  title: string;
  year: string | number | null;
  pages: string;
  chunk_count: number;
}

interface EdgeClaim {
  claim: string;
  stance: string;
  rationale: string;
  passages: { paper_id: string; paper_title: string; page: number; text: string }[];
}

interface MapEdge {
  id: string;
  source_paper_id: string;
  target_paper_id: string;
  claim: string;
  claims: EdgeClaim[];
  stance: string;
  confidence: string;
  passages: { paper_id: string; paper_title: string; page: number; text: string }[];
}

interface MapResponse {
  nodes: MapNode[];
  edges: MapEdge[];
  claims_total: number;
  generated_at: string;
}

const STANCE_COLORS: Record<string, string> = {
  agrees: "#23825A",
  contradicts: "#C3424D",
  partial: "#A87513",
};
const STANCE_BG: Record<string, string> = {
  agrees: "#E6F4EC",
  contradicts: "#FBECEE",
  partial: "#FFF4D9",
};

type PaperNodeType = Node<{ title: string; pages: string; chunkCount: number; selected: boolean }, "paperNode">;

function PaperNode({ data, selected }: NodeProps<PaperNodeType>) {
  return (
    <div
      className={`w-44 rounded-xl bg-white border px-3 py-2.5 shadow-sm transition-all duration-150 ${
        selected ? "border-[#397F70] shadow-md" : "border-[#EAE9EA] hover:border-[#397F70]/60"
      }`}
      style={{ borderLeft: "3px solid #397F70" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#397F70] !w-2 !h-2" />
      <div className="text-xs font-semibold text-[#251F21] leading-snug line-clamp-2">{data.title}</div>
      <div className="text-[10px] font-mono text-[#585254] mt-1">
        {data.pages ? `${data.pages} pages` : ""}{data.pages && data.chunkCount ? " · " : ""}{data.chunkCount ? `${data.chunkCount} chunks` : ""}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#397F70] !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { paperNode: PaperNode };

export function ContradictionMapView() {
  const { papers } = useUpload();
  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<MapEdge | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<PaperNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<{ fitView: (o?: { padding?: number }) => void } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // The tab mounts while hidden (its wrapper is display:none until selected), so
  // React Flow measures a 0x0 pane and fitView lands at minZoom with the graph
  // off-screen. Refit once the canvas actually has size and nodes exist.
  useEffect(() => {
    const el = canvasRef.current;
    if (!rfInstance || !el || nodes.length === 0) return;
    const tryFit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        requestAnimationFrame(() => rfInstance.fitView({ padding: 0.2 }));
      }
    };
    tryFit();
    const ro = new ResizeObserver(() => tryFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [rfInstance, nodes.length]);

  const indexedPaperIds = useMemo(
    () => papers.filter((p) => p.status === "indexed" || p.status === "ready").map((p) => p.id),
    [papers]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getContradictionMap(indexedPaperIds)
      .then((res: MapResponse) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [indexedPaperIds.join(",")]);

  // Deterministic circle layout
  useEffect(() => {
    if (!data) return;
    const n = data.nodes.length;
    const radius = Math.max(180, n * 46);
    const cx = 400;
    const cy = 280;
    const flowNodes: PaperNodeType[] = data.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      return {
        id: node.paper_id,
        type: "paperNode",
        position: { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) },
        data: { title: node.title, pages: node.pages, chunkCount: node.chunk_count, selected: false },
      };
    });
    setNodes(flowNodes);

    const flowEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source_paper_id,
      target: e.target_paper_id,
      animated: e.stance === "contradicts",
      style: {
        stroke: STANCE_COLORS[e.stance] || "#A87513",
        strokeWidth: 2.5,
        ...(e.stance === "contradicts" ? { strokeDasharray: "6 6" } : {}),
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: STANCE_COLORS[e.stance] || "#A87513" },
    }));
    setEdges(flowEdges);
  }, [data, setNodes, setEdges]);

  // Hover highlighting: node -> connected edges; edge -> bolder
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const connectedToHoverNode = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);
        const isHoveredEdge = hoveredEdge === e.id || selectedEdge?.id === e.id;
        const base = data?.edges.find((de) => de.id === e.id);
        const color = STANCE_COLORS[base?.stance || "partial"] || "#A87513";
        return {
          ...e,
          style: {
            ...(e.style || {}),
            stroke: color,
            strokeWidth: isHoveredEdge || connectedToHoverNode ? 4 : 2.5,
            opacity: hoveredEdge || hoveredNode ? (isHoveredEdge || connectedToHoverNode ? 1 : 0.35) : 1,
          },
          label: isHoveredEdge ? base?.stance : undefined,
          labelStyle: { fill: color, fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: STANCE_BG[base?.stance || "partial"], fillOpacity: 0.95 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
        };
      })
    );
  }, [hoveredNode, hoveredEdge, selectedEdge, data, setEdges]);

  const onEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const found = data?.edges.find((e) => e.id === edge.id);
      if (found) setSelectedEdge(found);
    },
    [data]
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-full max-w-3xl h-96 rounded-2xl animate-shimmer" />
        <Loader2 className="w-6 h-6 animate-spin text-[#397F70]" />
        <p className="text-xs font-mono text-[#585254]">Aligning claims across papers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[#C3424D]/30 bg-[#FBECEE] p-6 max-w-md text-center">
          <p className="text-sm font-semibold text-[#C3424D]">Could not build the map</p>
          <p className="text-xs text-[#585254] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Floating view header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-16 left-5 z-10 rounded-2xl bg-white border border-[#EAE9EA] shadow-[0_1px_2px_rgba(37,31,33,0.06),0_8px_24px_rgba(37,31,33,0.08)] p-4 max-w-xs"
      >
        <h2 className="text-xl font-bold text-[#251F21] flex items-center gap-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <Waypoints className="w-5 h-5 text-[#397F70]" />
          Contradiction Map
        </h2>
        <p className="text-xs text-[#585254] mt-1">How the findings of your papers align and conflict.</p>
        <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-[#585254]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#23825A]" /> Agrees</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C3424D]" /> Contradicts</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A87513]" /> Partial</span>
        </div>
      </motion.div>

      {/* Canvas card */}
      <div ref={canvasRef} className="flex-1 m-4 mt-14 rounded-2xl bg-[#FBFCFC] border border-[#EAE9EA] overflow-hidden">
        {data && data.nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-2xl border border-dashed border-[#EAE9EA] p-8 text-center max-w-sm">
              <Waypoints className="w-8 h-8 text-[#585254] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#251F21]">No papers indexed yet</p>
              <p className="text-xs text-[#585254] mt-1">Upload at least two papers to see how their findings align.</p>
            </div>
          </div>
        ) : data && data.edges.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-2xl border border-dashed border-[#EAE9EA] p-8 text-center max-w-sm">
              <Waypoints className="w-8 h-8 text-[#585254] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#251F21]">No cross-paper alignments found in this corpus yet</p>
              <p className="text-xs text-[#585254] mt-1">Try papers on overlapping topics so claims can be compared.</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-[#585254]">Laying out the map...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onEdgeClick={onEdgeClick}
            onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdge(null)}
            onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
            onNodeMouseLeave={() => setHoveredNode(null)}
            fitView
            onInit={(instance) => setRfInstance(instance)}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#EAE9EA" gap={24} />
            <Controls className="!bg-white !border !border-[#EAE9EA] !shadow-md [&_button]:!bg-white [&_button]:!border-[#EAE9EA] [&_button]:!fill-[#585254]" />
            <MiniMap
              className="!bg-white !border !border-[#EAE9EA] !rounded-xl !shadow-md"
              nodeColor="#397F70"
              maskColor="rgba(244,239,236,0.7)"
            />
          </ReactFlow>
        )}
      </div>

      {/* Edge evidence drawer */}
      <EvidenceDrawer
        open={!!selectedEdge}
        onClose={() => setSelectedEdge(null)}
        title="Claim alignment"
        subtitle={selectedEdge ? `${selectedEdge.claims.length} claim(s) between these papers` : undefined}
      >
        {selectedEdge?.claims.map((c, i) => (
          <div key={i} className="space-y-2">
            <blockquote className="text-xs font-medium text-[#251F21] italic border-l-[3px] pl-3" style={{ borderColor: STANCE_COLORS[c.stance] }}>
              &ldquo;{c.claim}&rdquo;
            </blockquote>
            <span
              className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: STANCE_BG[c.stance], color: STANCE_COLORS[c.stance] }}
            >
              {c.stance}
            </span>
            {c.passages.map((p, j) => (
              <PassageCard key={j} paperTitle={p.paper_title} page={p.page} text={p.text} accent={c.stance === "agrees" ? "agree" : c.stance === "contradicts" ? "contradict" : "partial"} />
            ))}
            {i < selectedEdge.claims.length - 1 && <hr className="border-[#EAE9EA] !my-4" />}
          </div>
        ))}
      </EvidenceDrawer>
    </div>
  );
}
