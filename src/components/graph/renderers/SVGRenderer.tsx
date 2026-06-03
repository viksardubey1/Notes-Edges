/**
 * SVGRenderer — Notes & Edges
 *
 * Visual tier system — nodes tell a story:
 *   unexplored  = dim, small, dashed — waiting in the void
 *   visited     = warm, normal — familiar territory
 *   reviewing   = amber pulse — actively wrestling with it
 *   understood  = confident green ring — claimed knowledge
 *   mastered    = radiant cyan double-ring — luminous, settled
 *   frontier    = beckoning warm rose pulse — "explore me"
 *
 * Depth layers (on node selection):
 *   0 = selected         — foreground hero
 *   1 = direct neighbors — fully awake + awakening pulse
 *   2 = 2-hop            — midground haze (light blur)
 *   3 = everything else  — deep cosmic fog (heavy blur)
 */

'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GraphData, LODLevel, GraphNode, SemanticEdgeType, LearningState } from '@/types/graph';
import { useGraphStore, getNeighborNodeIds, getNeighborEdgeIds } from '@/store/graph.store';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { getTopNodesByPercent } from '@/lib/graph/layout';
import { edgeOpacityFromWeight, truncateWords, hashString } from '@/lib/utils';
import {
  EDGE_STROKE_WIDTH,
  EDGE_STROKE_COLOR,
  EDGE_STROKE_COLOR_ACTIVE,
  EDGE_CURVE_TENSION,
  EDGE_CURVE_MAX_OFFSET,
  EDGE_WIDTH_MULT,
  EDGE_HALO,
  SEMANTIC_TYPE_ABBR,
  semanticColor,
} from '@/lib/graph/edge-config';

// ── Visual tier system ────────────────────────────────────────────────────────

type VisualTier = 'unexplored' | 'visited' | 'reviewing' | 'understood' | 'mastered';

const LEARNING_STATE_TO_TIER: Partial<Record<LearningState, VisualTier>> = {
  reviewing:  'reviewing',
  understood: 'understood',
  mastered:   'mastered',
};

// Per-tier visual config
const TIER_CONFIG: Record<VisualTier, {
  radiusMult: number;       // node size multiplier
  glowColor: string;        // ambient glow color
  glowRadius: number;       // extra glow ring radius offset
  glowOpacity: number;      // ambient glow opacity
  strokeSuffix: string;     // hex alpha suffix for cluster color stroke
  strokeWidth: number;
  strokeDash?: string;
}> = {
  unexplored: { radiusMult: 0.80, glowColor: 'none',    glowRadius: 0,  glowOpacity: 0,    strokeSuffix: '28', strokeWidth: 0.7, strokeDash: '3 2' },
  visited:    { radiusMult: 1.00, glowColor: 'inherit', glowRadius: 6,  glowOpacity: 0.06, strokeSuffix: '80', strokeWidth: 1.0 },
  reviewing:  { radiusMult: 1.00, glowColor: '#D4A840', glowRadius: 12, glowOpacity: 0.14, strokeSuffix: 'AA', strokeWidth: 1.0 },
  understood: { radiusMult: 1.04, glowColor: '#60C898', glowRadius: 14, glowOpacity: 0.18, strokeSuffix: 'CC', strokeWidth: 1.2 },
  mastered:   { radiusMult: 1.08, glowColor: '#60C0E8', glowRadius: 20, glowOpacity: 0.26, strokeSuffix: 'FF', strokeWidth: 1.5 },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface SVGRendererProps {
  graph: GraphData;
  zoom: number;
  pan: { x: number; y: number };
  lodLevel: LODLevel;
  dimensions: { width: number; height: number };
  showSecondDegree: boolean;
}

export function SVGRenderer({ graph, zoom, pan, lodLevel, dimensions, showSecondDegree }: SVGRendererProps) {
  const {
    selectedNodeId, selectedEdgeId, hoveredNodeId, hoveredEdgeId,
    filteredNodeIds, isClusterModeActive, learningStates,
    visitedNodeIds, backdropUrl,
  } = useGraphStore();

  const hasBackdrop = !!backdropUrl;

  const { handleNodeClick, handleNodeDoubleClick, handleEdgeClick, hoverNode, hoverEdge } = useGraphInteractions();

  const neighborNodeIds  = getNeighborNodeIds(graph, selectedNodeId);
  const neighborEdgeIds  = getNeighborEdgeIds(graph, selectedNodeId);

  // Hover-node neighbors — only meaningful when no node/edge is selected
  const hoveredNodeNeighborEdgeIds = useMemo(
    () => (hoveredNodeId && !selectedNodeId) ? getNeighborEdgeIds(graph, hoveredNodeId) : new Set<string>(),
    [graph, hoveredNodeId, selectedNodeId],
  );
  const hoveredNodeNeighborNodeIds = useMemo(
    () => (hoveredNodeId && !selectedNodeId) ? getNeighborNodeIds(graph, hoveredNodeId) : new Set<string>(),
    [graph, hoveredNodeId, selectedNodeId],
  );

  // Nodes connected to selected edge
  const selectedEdgeNodeIds = useMemo(() => {
    if (!selectedEdgeId) return new Set<string>();
    const edge = graph.edges.find((e) => e.id === selectedEdgeId);
    return edge ? new Set([edge.sourceId, edge.targetId]) : new Set<string>();
  }, [selectedEdgeId, graph.edges]);

  // Depth layer map — BFS 0/1/2/3+ from selected node
  const nodeDepthMap = useMemo(() => {
    if (!selectedNodeId) return new Map<string, number>();
    const map = new Map<string, number>();
    map.set(selectedNodeId, 0);
    for (const id of neighborNodeIds) map.set(id, 1);
    for (const id of neighborNodeIds) {
      for (const edge of graph.edges) {
        const other = edge.sourceId === id ? edge.targetId
          : edge.targetId === id ? edge.sourceId : null;
        if (other && !map.has(other)) map.set(other, 2);
      }
    }
    return map;
  }, [selectedNodeId, neighborNodeIds, graph.edges]);

  // Frontier: unvisited neighbors of selected node — beckoning exploration
  const frontierNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const frontier = new Set<string>();
    for (const id of neighborNodeIds) {
      const ls = learningStates[id] as LearningState | undefined;
      if (!visitedNodeIds.has(id) || ls === 'unset' || !ls) frontier.add(id);
    }
    return frontier;
  }, [selectedNodeId, neighborNodeIds, visitedNodeIds, learningStates]);

  // Camera transition on node selection AND deselection
  const [cameraTransition, setCameraTransition] = useState(false);
  const prevSelectedId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedNodeId !== prevSelectedId.current) {
      prevSelectedId.current = selectedNodeId;
      setCameraTransition(true);
      const t = setTimeout(() => setCameraTransition(false), 500);
      return () => clearTimeout(t);
    }
  }, [selectedNodeId]);

  // ── Progressive disclosure: top-3 edges per node (default state) ─────────────
  // Shows only the 3 strongest edges per node so the default view reads cleanly.
  // Hover and selection states reveal more edges contextually.
  const topEdgeIds = useMemo(() => {
    const nodeEdgeMap = new Map<string, Array<{ id: string; weight: number }>>();
    for (const edge of graph.edges) {
      if (!nodeEdgeMap.has(edge.sourceId)) nodeEdgeMap.set(edge.sourceId, []);
      if (!nodeEdgeMap.has(edge.targetId)) nodeEdgeMap.set(edge.targetId, []);
      nodeEdgeMap.get(edge.sourceId)!.push({ id: edge.id, weight: edge.weight });
      nodeEdgeMap.get(edge.targetId)!.push({ id: edge.id, weight: edge.weight });
    }
    const result = new Set<string>();
    for (const edges of nodeEdgeMap.values()) {
      const sorted = [...edges].sort((a, b) => b.weight - a.weight);
      for (const e of sorted.slice(0, 3)) result.add(e.id);
    }
    return result;
  }, [graph.edges]);

  // ── Neighbor-to-neighbor edges (selected state secondary neighborhood) ────────
  // Edges between direct neighbors that don't touch the selected node itself.
  // Rendered at reduced opacity (55%) so the selected-node edges stay dominant.
  const neighborInterEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const result = new Set<string>();
    for (const edge of graph.edges) {
      if (
        neighborNodeIds.has(edge.sourceId) &&
        neighborNodeIds.has(edge.targetId) &&
        !neighborEdgeIds.has(edge.id)
      ) result.add(edge.id);
    }
    return result;
  }, [selectedNodeId, neighborNodeIds, neighborEdgeIds, graph.edges]);

  // ── Persistent label nodes: root + top-8 + active learning path ──────────────
  // These nodes always show labels in default state regardless of zoom.
  // All other node labels are hidden until hover, zoom, or selection.
  const topLabelNodeIds = useMemo(() => {
    const sorted = [...graph.nodes].sort((a, b) => b.centrality - a.centrality);
    const result = new Set<string>();
    // Root + top 8 by centrality
    for (let i = 0; i < Math.min(8, sorted.length); i++) result.add(sorted[i].id);
    // Active learning path = nodes currently being reviewed
    for (const node of graph.nodes) {
      if ((learningStates[node.id] as LearningState) === 'reviewing') result.add(node.id);
    }
    return result;
  }, [graph.nodes, learningStates]);

  // "Up next" suggestion — history-aware, no loops
  const { navigationHistory } = useGraphStore();
  const nextSuggestionNodeId = useMemo(() => {
    if (!selectedNodeId || !graph) return null;
    const historySet = new Set(navigationHistory);

    // Build adjacency
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      const a = adj.get(e.sourceId) ?? []; a.push(e.targetId); adj.set(e.sourceId, a);
      const b = adj.get(e.targetId) ?? []; b.push(e.sourceId); adj.set(e.targetId, b);
    }

    // 1. Unvisited direct neighbour not in history
    const directNeighbors = (adj.get(selectedNodeId) ?? [])
      .map((id) => ({ id, weight: graph.edges.find((e) => (e.sourceId === selectedNodeId && e.targetId === id) || (e.targetId === selectedNodeId && e.sourceId === id))?.weight ?? 0 }))
      .sort((a, b) => b.weight - a.weight);
    const unvisitedDirect = directNeighbors.filter((n) => !visitedNodeIds.has(n.id) && !historySet.has(n.id));
    if (unvisitedDirect.length > 0) return unvisitedDirect[0].id;

    // 2. BFS — nearest unvisited node anywhere in graph, skipping history
    const seen = new Set([selectedNodeId]);
    const queue: string[] = [selectedNodeId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nbr of adj.get(cur) ?? []) {
        if (seen.has(nbr)) continue;
        seen.add(nbr);
        if (!visitedNodeIds.has(nbr) && !historySet.has(nbr)) return nbr;
        queue.push(nbr);
      }
    }

    // 3. Everything visited — suggest highest-weight direct neighbour that isn't the immediate prev
    const prevId = navigationHistory[navigationHistory.length - 1] ?? null;
    const notPrev = directNeighbors.filter((n) => n.id !== prevId);
    return notPrev.length > 0 ? notPrev[0].id : null;
  }, [selectedNodeId, graph, visitedNodeIds, navigationHistory]);

  // Cluster colors for gradient defs
  const clusterColors = useMemo(() => {
    const colors = new Set<string>();
    for (const n of graph.nodes) if (n.clusterColor) colors.add(n.clusterColor);
    return [...colors];
  }, [graph.nodes]);

  // Viewport-fixed ambient star field — seeded deterministically
  const starParticles = useMemo(() => {
    const W = dimensions.width  || 1200;
    const H = dimensions.height || 800;
    const pts: Array<{
      px: number; py: number; sz: number;
      drift: 1 | 2 | 3; delay: number; color: string; opacity: number;
    }> = [];
    for (let i = 0; i < 72; i++) {
      const px      = ((i * 73 + 41)  % 997) / 997 * W;
      const py      = ((i * 47 + 83)  % 991) / 991 * H;
      const sz      = i % 9 === 0 ? 1.6 : i % 4 === 0 ? 1.0 : 0.55;
      const drift   = ((i % 3) + 1) as 1 | 2 | 3;
      const delay   = (i * 1.37) % 11;
      const color   = i % 7  === 0 ? '#9876EE'
                    : i % 11 === 0 ? '#60C0E8'
                    : i % 13 === 0 ? '#D4A840'
                    : '#ffffff';
      const opacity = i % 5 === 0 ? 0.28 : i % 3 === 0 ? 0.16 : 0.09;
      pts.push({ px, py, sz, drift, delay, color, opacity });
    }
    return pts;
  }, [dimensions.width, dimensions.height]);

  // Selected node's cluster (for blob illumination)
  const selectedClusterId = useMemo(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId)?.clusterId ?? null;
  }, [selectedNodeId, graph.nodes]);

  // Semantic zoom threshold
  const semanticThreshold = zoom < 0.4 ? 0.7 : zoom < 0.8 ? 0.4 : 0;

  const visibleNodeIds = useMemo(() => {
    const byLod = getTopNodesByPercent(graph.nodes, lodLevel.showTopNodePercent);
    if (semanticThreshold === 0) return byLod;
    return new Set([...byLod].filter((id) => {
      const n = graph.nodes.find((nd) => nd.id === id);
      return n ? n.centrality >= semanticThreshold : false;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, lodLevel.showTopNodePercent, semanticThreshold]);

  const activeNodeIds = visibleNodeIds;

  // ── Collision-safe background labels ─────────────────────────────────────────
  // Greedy placement: priority-sorted nodes claim label space; lower-priority
  // nodes are hidden if their label bounding box overlaps an already-placed one.
  // Selected/hovered/neighbor labels bypass this (they always render).
  // 16px label-to-label and 12px label-to-node padding enforced.
  const collisionSafeLabelIds = useMemo(() => {
    const PAD = 16;

    const getRadius = (node: GraphNode): number => {
      const ls = (learningStates[node.id] ?? 'unset') as LearningState;
      const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
      return (node.size ?? 14) * TIER_CONFIG[tier].radiusMult;
    };

    const getLabelBox = (
      node: GraphNode,
    ): { x: number; y: number; w: number; h: number } => {
      const ls = (learningStates[node.id] ?? 'unset') as LearningState;
      const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
      const fontSize = node.id === selectedNodeId ? 13 : tier === 'mastered' ? 12 : 11;
      const labelText = truncateWords(node.label, 4);
      const labelW = labelText.length * (fontSize * 0.52) + 14;
      const labelH = fontSize + 5;
      const radius = getRadius(node);
      return {
        x: (node.x ?? 0) - labelW / 2,
        y: (node.y ?? 0) + radius + 5,
        w: labelW,
        h: labelH,
      };
    };

    const overlaps = (
      box: { x: number; y: number; w: number; h: number },
      occupied: Array<{ x: number; y: number; w: number; h: number }>,
    ): boolean => {
      for (const b of occupied) {
        if (
          box.x < b.x + b.w + PAD &&
          box.x + box.w > b.x - PAD &&
          box.y < b.y + b.h + PAD &&
          box.y + box.h > b.y - PAD
        ) return true;
      }
      return false;
    };

    // Pre-occupy space for always-visible labels (selected / hovered / neighbors)
    const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
    const reserve = (id: string) => {
      const n = graph.nodes.find((nd) => nd.id === id);
      if (n) occupied.push(getLabelBox(n));
    };
    if (selectedNodeId) reserve(selectedNodeId);
    if (hoveredNodeId) reserve(hoveredNodeId);
    for (const id of neighborNodeIds) reserve(id);

    // Sort background candidates by priority: topLabelNodeIds > mastered > understood > centrality
    const candidates = graph.nodes
      .filter((n) =>
        activeNodeIds.has(n.id) &&
        n.id !== selectedNodeId &&
        n.id !== hoveredNodeId &&
        !neighborNodeIds.has(n.id),
      )
      .map((n) => {
        const ls = (learningStates[n.id] ?? 'unset') as LearningState;
        const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
        const bonus = topLabelNodeIds.has(n.id) ? 2
          : tier === 'mastered' ? 1
          : tier === 'understood' ? 0.5
          : 0;
        return { node: n, priority: n.centrality + bonus };
      })
      .sort((a, b) => b.priority - a.priority);

    const result = new Set<string>();
    for (const { node } of candidates) {
      const box = getLabelBox(node);
      if (!overlaps(box, occupied)) {
        occupied.push(box);
        result.add(node.id);
      }
    }
    return result;
  }, [
    graph.nodes, activeNodeIds, selectedNodeId, hoveredNodeId,
    neighborNodeIds, topLabelNodeIds, learningStates,
  ]);

  // BFS reveal delays
  const nodeRevealDelay = useMemo(() => {
    if (!graph.nodes.length) return new Map<string, number>();
    const root = graph.nodes.reduce((a, b) => (a.centrality > b.centrality ? a : b));
    const dist = new Map<string, number>([[root.id, 0]]);
    const queue: string[] = [root.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const d = dist.get(cur)!;
      for (const e of graph.edges) {
        const nbr = e.sourceId === cur ? e.targetId : e.targetId === cur ? e.sourceId : null;
        if (nbr && !dist.has(nbr)) { dist.set(nbr, d + 1); queue.push(nbr); }
      }
    }
    const maxDist = Math.max(0, ...[...dist.values()]);
    for (const n of graph.nodes) if (!dist.has(n.id)) dist.set(n.id, maxDist + 1);
    const delays = new Map<string, number>();
    for (const [id, d] of dist) delays.set(id, d * 0.16);
    return delays;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id]);

  // Cluster blobs
  const clusterBlobs = useMemo(() => {
    const groups = new Map<string, { nodes: GraphNode[]; color: string }>();
    const blobNodes = graph.nodes;
    for (const n of blobNodes) {
      if (!n.clusterId) continue;
      const g = groups.get(n.clusterId) ?? { nodes: [], color: n.clusterColor ?? '#4A4A6A' };
      g.nodes.push(n); groups.set(n.clusterId, g);
    }
    return [...groups.entries()].map(([id, { nodes, color }]) => {
      const xs = nodes.map((n) => n.x ?? 0);
      const ys = nodes.map((n) => n.y ?? 0);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const spread = Math.max(60, ...nodes.map((n) => Math.hypot((n.x ?? 0) - cx, (n.y ?? 0) - cy)));
      return { id, cx, cy, rx: spread * 1.6, ry: spread * 1.3, color };
    });
  }, [graph.nodes]);

  // Graph centroid + max spread — for ambient depth opacity
  const { graphCx, graphCy, graphMaxDist } = useMemo(() => {
    if (!graph.nodes.length) return { graphCx: 0, graphCy: 0, graphMaxDist: 1 };
    const xs = graph.nodes.map((n) => n.x ?? 0);
    const ys = graph.nodes.map((n) => n.y ?? 0);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const maxDist = Math.max(1, ...graph.nodes.map((n) => Math.hypot((n.x ?? 0) - cx, (n.y ?? 0) - cy)));
    return { graphCx: cx, graphCy: cy, graphMaxDist: maxDist };
  }, [graph.nodes]);

  const canvasCx = dimensions.width / 2;
  const canvasCy = dimensions.height / 2;
  const filterId = `blob-blur-${graph.id}`;
  const atmoFilterId = `atmo-blur-${graph.id}`;
  const groupTransform = `translate(${canvasCx + pan.x}px, ${canvasCy + pan.y}px) scale(${zoom})`;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        {/* Atmospheric cluster haze — much larger, very soft */}
        <filter id={atmoFilterId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="90" />
        </filter>
        <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="masteredGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="nextGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* Depth fog filters */}
        <filter id="depthFog-light" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id="depthFog-heavy" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4.0" />
        </filter>
        {/* Label legibility shadow — used when backdrop image is active */}
        <filter id="labelShadow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.22)" />
        </filter>
        {/* Node backdrop shadow — soft drop shadow to lift nodes off busy backgrounds */}
        <filter id="nodeBackdropShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.28)" />
        </filter>
        {/* Edge glow — white luminous border on outgoing edges of selected node */}
        <filter id="edgeGlow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Per-cluster glass orb gradients */}
        {clusterColors.map((color) => (
          <radialGradient key={color} id={`ng-${color.slice(1)}`} cx="35%" cy="28%" r="72%" fx="35%" fy="28%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={hasBackdrop ? 0.90 : 0.72} />
            <stop offset="40%"  stopColor={color}   stopOpacity={hasBackdrop ? 0.80 : 0.52} />
            <stop offset="100%" stopColor={color}   stopOpacity={hasBackdrop ? 0.72 : 0.28} />
          </radialGradient>
        ))}
        {/* Mastered node */}
        {clusterColors.map((color) => (
          <radialGradient key={`m-${color}`} id={`ng-mastered-${color.slice(1)}`} cx="30%" cy="25%" r="72%" fx="30%" fy="25%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={hasBackdrop ? 0.95 : 0.82} />
            <stop offset="35%"  stopColor={color}   stopOpacity={hasBackdrop ? 0.88 : 0.65} />
            <stop offset="100%" stopColor={color}   stopOpacity={hasBackdrop ? 0.78 : 0.32} />
          </radialGradient>
        ))}
        {/* Understood node */}
        {clusterColors.map((color) => (
          <radialGradient key={`u-${color}`} id={`ng-understood-${color.slice(1)}`} cx="35%" cy="28%" r="72%" fx="35%" fy="28%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={hasBackdrop ? 0.92 : 0.74} />
            <stop offset="40%"  stopColor={color}   stopOpacity={hasBackdrop ? 0.82 : 0.55} />
            <stop offset="100%" stopColor={color}   stopOpacity={hasBackdrop ? 0.74 : 0.25} />
          </radialGradient>
        ))}
        {/* Selection gradient — light canvas */}
        <radialGradient id="ng-selected" cx="35%" cy="28%" r="72%" fx="35%" fy="28%">
          <stop offset="0%"   stopColor="#FFFFFF"   stopOpacity="0.60" />
          <stop offset="45%"  stopColor="#7B6EC4"   stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5A4AAA"   stopOpacity="0.70" />
        </radialGradient>
        {/* Hover gradient — light canvas */}
        <radialGradient id="ng-hover" cx="35%" cy="28%" r="72%" fx="35%" fy="28%">
          <stop offset="0%"   stopColor="#FFFFFF"   stopOpacity="0.50" />
          <stop offset="100%" stopColor="#9585DC"   stopOpacity="0.22" />
        </radialGradient>

      </defs>

      {/* Star field hidden on light theme */}

      <g style={{
        transform: groupTransform,
        transformOrigin: '0px 0px',
        transition: cameraTransition ? 'transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
      }}>

        {/* ── Atmospheric haze — very large blur, barely visible ───────────── */}
        <g className="cluster-atmosphere pointer-events-none">
          {clusterBlobs.map((blob) => {
            const isActiveCluster = selectedClusterId === blob.id;
            return (
              <ellipse
                key={`atmo-${blob.id}`}
                cx={blob.cx} cy={blob.cy}
                rx={blob.rx * 2.2} ry={blob.ry * 2.2}
                fill={blob.color}
                opacity={isActiveCluster ? 0.09 : selectedClusterId ? 0.02 : 0.05}
                filter={`url(#${atmoFilterId})`}
                style={{ transition: 'opacity 600ms ease-out' }}
              />
            );
          })}
        </g>

        {/* ── Cluster blobs — selected cluster illuminates ─────────────────── */}
        <g className="cluster-blobs pointer-events-none">
          {clusterBlobs.map((blob) => {
            const isActiveCluster = selectedClusterId === blob.id;
            return (
              <ellipse
                key={blob.id}
                cx={blob.cx} cy={blob.cy}
                rx={blob.rx} ry={blob.ry}
                fill={blob.color}
                opacity={isActiveCluster ? 0.14 : selectedClusterId ? 0.03 : 0.07}
                filter={`url(#${filterId})`}
                style={{ transition: 'opacity 400ms ease-out' }}
              />
            );
          })}
        </g>

        {/* ── Edges ─────────────────────────────────────────────────────────── */}
        {lodLevel.showEdges && (
          <g className="edges">
            {graph.edges.map((edge) => {
              const sourceNode = graph.nodes.find((n) => n.id === edge.sourceId);
              const targetNode = graph.nodes.find((n) => n.id === edge.targetId);
              if (!sourceNode || !targetNode) return null;
              if (!activeNodeIds.has(edge.sourceId) || !activeNodeIds.has(edge.targetId)) return null;
              if (lodLevel.showStrongEdgesOnly && edge.weight < 0.7) return null;
              // Minimum weight threshold — weak edges add noise without information
              if (edge.weight < 0.45) return null;

              const semType = (edge.semanticType ?? 'default') as SemanticEdgeType | 'default';
              // RELATES_TO edges are the noisiest — only show strong ones
              if (semType === 'RELATES_TO' && edge.weight < 0.68) return null;

              const isSelectedEdge      = selectedEdgeId === edge.id;
              const isSelectedNodeEdge  = neighborEdgeIds.has(edge.id);     // touches selected node
              const isNeighborInterEdge = neighborInterEdgeIds.has(edge.id); // between neighbors
              const isNeighborEdge      = isSelectedNodeEdge || isNeighborInterEdge;
              const isHovered           = hoveredEdgeId === edge.id;
              const isHoverNodeEdge     = hoveredNodeNeighborEdgeIds.has(edge.id);
              const isActive            = isNeighborEdge || isHovered || isSelectedEdge || isHoverNodeEdge;

              // ── Intra/inter cluster classification ────────────────────────
              const isIntraCluster = !!(
                sourceNode.clusterId &&
                targetNode.clusterId &&
                sourceNode.clusterId === targetNode.clusterId
              );

              // ── Visibility filter ─────────────────────────────────────────
              // DEFAULT: show only top-3 per node — clean overview
              if (!selectedNodeId && !hoveredNodeId && !selectedEdgeId && filteredNodeIds === null) {
                if (!topEdgeIds.has(edge.id)) return null;
              }
              // HOVER: show topEdgeIds + hover-node edges (others render at 6%)
              if (hoveredNodeId !== null && selectedNodeId === null && selectedEdgeId === null && filteredNodeIds === null) {
                if (!topEdgeIds.has(edge.id) && !isHoverNodeEdge) return null;
              }
              // SELECTED: show selected-node edges, inter-neighbor edges,
              //   and depth-2 edges only when expand button was pressed
              if (selectedNodeId !== null && !selectedEdgeId) {
                const srcDepth = nodeDepthMap.get(edge.sourceId) ?? 3;
                const tgtDepth = nodeDepthMap.get(edge.targetId) ?? 3;
                const minDepth = Math.min(srcDepth, tgtDepth);
                if (!isSelectedNodeEdge && !isNeighborInterEdge) {
                  if (minDepth >= 2 && !showSecondDegree) return null;
                  if (minDepth >= 3) return null;
                }
              }

              // ── Opacity ────────────────────────────────────────────────────
              // Three distinct states: default (cluster-tinted) → hover → selected.
              // Default opacity is higher than spec minimums for visual richness.
              let opacity: number;

              if (filteredNodeIds !== null) {
                const bothVisible = filteredNodeIds.has(edge.sourceId) && filteredNodeIds.has(edge.targetId);
                opacity = bothVisible ? (isIntraCluster ? 0.38 : 0.18) : 0.03;
              } else if (selectedEdgeId !== null) {
                opacity = isSelectedEdge ? 1.0 : 0.03;
              } else if (selectedNodeId !== null) {
                // SELECTED STATE
                if (isSelectedNodeEdge) {
                  opacity = 0.90; // selected node's direct edges — prominent
                } else if (isNeighborInterEdge) {
                  opacity = 0.58; // neighbor-to-neighbor — secondary
                } else {
                  opacity = showSecondDegree ? 0.28 : 0.04; // depth-2 when expanded
                }
              } else if (hoveredNodeId !== null) {
                // HOVER STATE
                opacity = isHoverNodeEdge ? 0.85 : 0.07;
              } else {
                // DEFAULT STATE — cluster-tinted, richer than generic gray
                opacity = isIntraCluster ? 0.38 : 0.18;
              }

              // ── Geometry ───────────────────────────────────────────────────
              const x1 = sourceNode.x ?? 0, y1 = sourceNode.y ?? 0;
              const x2 = targetNode.x ?? 0, y2 = targetNode.y ?? 0;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              const dx = x2 - x1, dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              // Long cross-graph edges fade — keeps local topology crisp.
              // Only apply to resting edges so neighborhood always reads clearly.
              if (len > 220 && !isActive) opacity *= Math.max(0.3, 1 - (len - 220) / 500);

              // ── Adaptive curvature ─────────────────────────────────────────
              // Reduced by 50% from previous values — prefer short direct curves.
              // Tension stays constant; no escalation on long edges (avoids sweeping arcs).
              const adaptiveTension = len < 180
                ? EDGE_CURVE_TENSION * 0.80
                : EDGE_CURVE_TENSION;
              const curveOffset = len > 10
                ? Math.min(len * adaptiveTension, EDGE_CURVE_MAX_OFFSET)
                : 0;
              const sign = edge.sourceId < edge.targetId ? 1 : -1;
              const cpx = len > 10 ? mx + (-dy / len) * curveOffset * sign : mx;
              const cpy = len > 10 ? my + (dx / len) * curveOffset * sign : my;

              // ── Per-edge tangential phase nudge ─────────────────────────
              // Deterministic offset along the edge direction — spreads edges
              // that share nearly identical arc paths so they don't overlap.
              const phaseHash = (hashString(edge.sourceId + edge.targetId) % 1000) / 1000;
              const tangentNudge = (phaseHash - 0.5) * 24; // ±12px
              const cpxF = len > 10 ? cpx + (dx / len) * tangentNudge : cpx;
              const cpyF = len > 10 ? cpy + (dy / len) * tangentNudge : cpy;
              const curvePath = `M ${x1} ${y1} Q ${cpxF} ${cpyF} ${x2} ${y2}`;

              // ── Edge connected to selected node (both directions) ────────
              const isOutgoing = isSelectedNodeEdge && !!selectedNodeId;

              // ── Stroke color ───────────────────────────────────────────────
              // Always use the cluster-tinted color — opacity (not hue) carries
              // the visual hierarchy between resting, hover, and selected states.
              const clusterColor = sourceNode.clusterColor ?? EDGE_STROKE_COLOR;
              const strokeColor  = clusterColor;

              // ── Stroke width ───────────────────────────────────────────────
              // DEFAULT: strong (≥ 0.7 weight) = 1.4px, medium = 1.0px
              // SELECTED: selected-node edges = 2px, neighbor inter-edges = 1.4px
              const strokeWidth = isSelectedEdge
                ? EDGE_STROKE_WIDTH * EDGE_WIDTH_MULT.selected          // 2.0px
                : isSelectedNodeEdge && selectedNodeId
                  ? 2.0                                                  // selected node edges: 2px
                  : isNeighborInterEdge
                    ? EDGE_STROKE_WIDTH * EDGE_WIDTH_MULT.neighbor      // 1.4px
                    : isHovered
                      ? EDGE_STROKE_WIDTH * EDGE_WIDTH_MULT.hovered     // 1.5px
                      : edge.weight >= 0.7
                        ? 1.4                                            // strong default edge
                        : EDGE_STROKE_WIDTH;                            // medium: 1.0px

              return (
                <g key={edge.id} className="pointer-events-auto">
                  {/* Wide transparent hit target for easy mouse interaction */}
                  <path d={curvePath} stroke="transparent" strokeWidth={16} fill="none"
                    onMouseEnter={() => hoverEdge(edge.id)} onMouseLeave={() => hoverEdge(null)}
                    onClick={(e) => { e.stopPropagation(); handleEdgeClick(edge.id); }}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Ambient cluster glow — soft halo behind every resting edge.
                      Gives edges depth and warmth; fades away during active states. */}
                  {!isActive && (
                    <path d={curvePath}
                      stroke={clusterColor}
                      strokeWidth={strokeWidth * 5}
                      fill="none" strokeLinecap="round" pointerEvents="none"
                      opacity={opacity * 0.18}
                    />
                  )}
                  {/* Selection / hover halo — cluster-tinted glow */}
                  {(isSelectedEdge || isHovered) && (
                    <path d={curvePath} stroke={clusterColor}
                      strokeWidth={EDGE_STROKE_WIDTH * EDGE_HALO.widthMult}
                      fill="none" opacity={isSelectedEdge ? EDGE_HALO.selectedOpacity : EDGE_HALO.hoveredOpacity}
                      strokeLinecap="round" pointerEvents="none"
                    />
                  )}
                  {/* Neighbor edge emergence flash */}
                  {isNeighborEdge && selectedNodeId && (
                    <motion.path
                      key={`emerge-${edge.id}-${selectedNodeId}`}
                      d={curvePath} stroke={clusterColor}
                      strokeWidth={EDGE_STROKE_WIDTH * EDGE_WIDTH_MULT.emergence}
                      fill="none" strokeLinecap="round" pointerEvents="none"
                      initial={{ opacity: 0.28, pathLength: 0 }}
                      animate={{ opacity: 0, pathLength: 1 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                  )}
                  {/* Luminous border — all edges connected to the selected node */}
                  {isOutgoing && (
                    <>
                      {/* Outer diffuse glow */}
                      <path d={curvePath}
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth={strokeWidth * 5}
                        fill="none" strokeLinecap="round" pointerEvents="none"
                        filter="url(#edgeGlow)"
                      />
                      {/* Crisp white border — sits between glow and main stroke */}
                      <path d={curvePath}
                        stroke="rgba(255,255,255,0.52)"
                        strokeWidth={strokeWidth + 1.0}
                        fill="none" strokeLinecap="round" pointerEvents="none"
                      />
                    </>
                  )}
                  {/* Main edge stroke — uniform across all edge types */}
                  <path
                    d={curvePath}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round" opacity={opacity}
                    style={{ transition: 'opacity 300ms ease-out, stroke-width 180ms ease-out, stroke 300ms ease-out' }}
                    pointerEvents="none"
                  />
                  {lodLevel.showEdgeLabels && edge.label && (
                    <EdgeLabelPill edge={edge} sourceNode={sourceNode} targetNode={targetNode} semType={semType} />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ── Nodes (non-selected) ──────────────────────────────────────────── */}
        <g className="nodes">
          {graph.nodes.filter((n) => n.id !== selectedNodeId).map((node) => {
            if (!activeNodeIds.has(node.id)) return null;

            const isSelected      = selectedNodeId === node.id;
            const isHovered       = hoveredNodeId  === node.id;
            const isNeighbor      = neighborNodeIds.has(node.id);
            const isEdgeEndpt     = selectedEdgeNodeIds.has(node.id);
            const isFrontier      = frontierNodeIds.has(node.id);
            const isNextSuggest   = node.id === nextSuggestionNodeId;
            const hasSelection    = selectedNodeId !== null || selectedEdgeId !== null;
            const isHoverNeighbor = !hasSelection && hoveredNodeId !== null && hoveredNodeNeighborNodeIds.has(node.id);

            // ── Visual tier ──
            const ls = (learningStates[node.id] ?? 'unset') as LearningState;
            const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
            const tierCfg = TIER_CONFIG[tier];

            // ── Radius (tier-adjusted) ──
            const radius = (node.size ?? 14) * tierCfg.radiusMult;

            // ── Depth layer ──
            const nodeDepth = selectedNodeId ? (nodeDepthMap.get(node.id) ?? 3) : 0;

            // ── Opacity ──
            // Ambient depth falloff: nodes further from graph centroid are slightly dimmer
            const distFromCenter = Math.hypot((node.x ?? 0) - graphCx, (node.y ?? 0) - graphCy);
            const depthFade = !hasSelection
              ? Math.max(hasBackdrop ? 0.82 : 0.75, 1 - (distFromCenter / graphMaxDist) * (hasBackdrop ? 0.15 : 0.18))
              : 1;

            let nodeOpacity = depthFade;
            // In base state, unexplored nodes are additionally dimmer
            if (!hasSelection && tier === 'unexplored') nodeOpacity = Math.min(nodeOpacity, 0.75);
            // HOVER STATE: non-neighbor nodes fade to 35% for focus
            if (!hasSelection && hoveredNodeId !== null && filteredNodeIds === null) {
              if (isHoverNeighbor || node.id === hoveredNodeId) nodeOpacity = 1.0;
              else nodeOpacity = Math.min(nodeOpacity, 0.35);
            }
            if (hasSelection) {
              if (selectedNodeId !== null) {
                if (isSelected || isNeighbor) nodeOpacity = 1;
                else nodeOpacity = 0.25; // all unrelated nodes fade to 25%
              } else {
                nodeOpacity = isEdgeEndpt ? 1 : 0.12;
              }
            }
            if (filteredNodeIds !== null) nodeOpacity = filteredNodeIds.has(node.id) ? 1 : 0.08;

            // ── Depth fog filter ──
            let nodeFilter: string | undefined;
            if (selectedNodeId !== null) {
              if (nodeDepth === 2) nodeFilter = 'url(#depthFog-light)';
              else if (nodeDepth >= 3) nodeFilter = 'url(#depthFog-heavy)';
            }

            // ── Fill ──
            let fillColor: string;
            if (isSelected)    fillColor = 'url(#ng-selected)';
            else if (isEdgeEndpt || isHovered) fillColor = 'url(#ng-hover)';
            else if (tier === 'mastered' && node.clusterColor)
              fillColor = `url(#ng-mastered-${node.clusterColor.slice(1)})`;
            else if (tier === 'understood' && node.clusterColor)
              fillColor = `url(#ng-understood-${node.clusterColor.slice(1)})`;
            else if (node.clusterColor)
              fillColor = `url(#ng-${node.clusterColor.slice(1)})`;
            else fillColor = 'var(--color-node-fill)';

            // ── Stroke ──
            let strokeColor: string;
            let strokeWidth: number;
            let strokeDash: string | undefined;

            if (isSelected) {
              strokeColor = 'var(--accent-bright)'; strokeWidth = 2;
            } else if (isEdgeEndpt) {
              strokeColor = node.clusterColor ? node.clusterColor + 'CC' : 'var(--accent-primary)'; strokeWidth = 2;
            } else if (isNextSuggest) {
              strokeColor = 'var(--accent-warm)'; strokeWidth = 1.5;
            } else if (isNeighbor) {
              strokeColor = node.clusterColor ? node.clusterColor + 'CC' : 'var(--accent-primary)'; strokeWidth = 1.8;
            } else {
              // Tier-based stroke
              if (tier === 'mastered')   { strokeColor = '#60C0E8';  strokeWidth = 1.5; }
              else if (tier === 'understood') { strokeColor = '#60C898CC'; strokeWidth = 1.2; }
              else if (tier === 'reviewing')  { strokeColor = '#D4A84099'; strokeWidth = 1.0; }
              else if (tier === 'unexplored') {
                strokeColor = node.clusterColor ? node.clusterColor + '40' : 'rgba(123,110,196,0.22)';
                strokeWidth = 0.7; strokeDash = '3 2';
              } else {
                strokeColor = node.clusterColor ? node.clusterColor + 'AA' : 'var(--color-node-ring)';
                strokeWidth = 1;
              }
            }

            // ── Label visibility ──
            const revealDelay = nodeRevealDelay.get(node.id) ?? 0;
            const isCore      = node.centrality >= 0.65;
            const isImportant = node.centrality >= 0.4 && node.centrality < 0.65;
            const glowColor   = node.clusterColor ?? 'var(--accent-primary)';

            // Centrality threshold for LOD-gated labels (zoom 0.8–1.3 = tier 3)
            const labelCentralityThreshold = zoom < 1.3 ? 0.30 : 0.10;

            // Always show: selected, hovered, neighbors, root+top-8, mastered/understood
            // All others need LOD permission + collision safety
            const alwaysShowLabel = isSelected || isHovered || isNeighbor
              || topLabelNodeIds.has(node.id)
              || tier === 'mastered' || tier === 'understood';
            const showLabel = alwaysShowLabel
              ? true
              : (lodLevel.showLabels || (isHovered && lodLevel.showLabelsOnHover))
                && node.centrality >= labelCentralityThreshold
                && collisionSafeLabelIds.has(node.id);
            const renderLabel = showLabel && 12 * zoom >= 8;

            const learningRingColor = ls === 'unset' ? null
              : ls === 'understood' ? 'var(--color-state-understood)'
              : ls === 'reviewing'  ? 'var(--color-state-reviewing)'
              : ls === 'weak'       ? 'var(--color-state-weak)'
              : ls === 'mastered'   ? 'var(--color-state-mastered)'
              : null;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id, e.shiftKey); }}
                onDoubleClick={(e) => { e.stopPropagation(); handleNodeDoubleClick(node.id); }}
                onMouseEnter={() => hoverNode(node.id)}
                onMouseLeave={() => hoverNode(null)}
                role="button"
                aria-label={`Concept: ${node.label}`}
                tabIndex={0}
                style={{
                  opacity: nodeOpacity,
                  filter: nodeFilter,
                  transition: 'opacity 320ms ease-out, filter 320ms ease-out',
                  outline: 'none',
                }}
              >
                {/* ── MASTERED: steady double-ring on light canvas ───────────── */}
                {tier === 'mastered' && !isSelected && (
                  <>
                    {/* Inner steady ring */}
                    <circle r={radius + 5} fill="none" stroke="#3A90B8"
                      strokeWidth={1.0} opacity={0.50} className="pointer-events-none" />
                    {/* Outer breathing ring */}
                    <motion.circle r={radius + 12} fill="none" stroke="#3A90B8"
                      strokeWidth={0.7} className="pointer-events-none"
                      animate={{ r: [radius + 11, radius + 17, radius + 11], opacity: [0.30, 0.04, 0.30] }}
                      transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}

                {/* ── UNDERSTOOD: steady confident ring ─────────────────────── */}
                {tier === 'understood' && !isSelected && (
                  <>
                    <circle r={radius + 5} fill="none" stroke="#3A9870"
                      strokeWidth={1.0} opacity={0.45} className="pointer-events-none" />
                  </>
                )}

                {/* ── REVIEWING: warm amber pulse ────────────────────────────── */}
                {tier === 'reviewing' && !isSelected && (
                  <>
                    <motion.circle r={radius + 7} fill="none" stroke="#B88A30"
                      strokeWidth={1} strokeDasharray="4 3" className="pointer-events-none"
                      animate={{ opacity: [0.10, 0.38, 0.10] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}

                {/* ── FRONTIER beckoning pulse (unvisited neighbor) ───────────── */}
                {isFrontier && selectedNodeId && (
                  <motion.circle
                    key={`frontier-${node.id}-${selectedNodeId}`}
                    r={radius + 10}
                    fill="none"
                    stroke="var(--accent-warm)"
                    strokeWidth={1.2}
                    className="pointer-events-none"
                    animate={{
                      r: [radius + 8, radius + 16, radius + 8],
                      opacity: [0.30, 0.04, 0.30],
                    }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  />
                )}


                {/* ── Centrality glow — core ────────────────────────────────── */}
                {isCore && (
                  <circle r={radius + (isNeighbor ? 14 : 12)} fill={glowColor}
                    opacity={isNeighbor ? 0.07 : 0.06}
                    filter="url(#nodeGlow)" className="pointer-events-none"
                    style={{ transition: 'r 300ms ease-out, opacity 300ms ease-out' }}
                  />
                )}

                {/* ── Centrality glow — important ───────────────────────────── */}
                {isImportant && (
                  <circle r={radius + (isNeighbor ? 10 : 8)} fill={glowColor}
                    opacity={isNeighbor ? 0.06 : 0.04}
                    filter="url(#nodeGlow)" className="pointer-events-none"
                    style={{ transition: 'r 300ms ease-out, opacity 300ms ease-out' }}
                  />
                )}

                {/* ── Neighbor ambient halo ─────────────────────────────────── */}
                {isNeighbor && !isSelected && (
                  <circle r={radius + 6} fill={node.clusterColor ?? 'var(--accent-primary)'}
                    opacity={0.05} filter="url(#nodeGlow)" className="pointer-events-none"
                  />
                )}

                {/* ── Hover-neighbor ring — lights up neighbors when hovering another node ── */}
                {isHoverNeighbor && !isHovered && (
                  <circle r={radius + 5} fill="none"
                    stroke={node.clusterColor ?? 'var(--accent-primary)'}
                    strokeWidth={1.2} opacity={0.45}
                    className="pointer-events-none"
                    style={{ transition: 'opacity 200ms ease-out' }}
                  />
                )}

                {/* ── Selection pulse ring ──────────────────────────────────── */}
                {isSelected && (
                  <>
                    <circle r={radius + 12} fill="var(--accent-primary)"
                      opacity={0.06} filter="url(#nodeGlow)" className="pointer-events-none"
                    />
                    <motion.circle r={radius + 7} fill="none"
                      stroke="var(--accent-primary)" strokeWidth={1.5} strokeOpacity={0.4}
                      className="pointer-events-none"
                      animate={{ r: [radius + 6, radius + 13, radius + 6], opacity: [0.5, 0.06, 0.5] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}

                {/* ── "Up next" waypoint ────────────────────────────────────── */}
                {isNextSuggest && !isSelected && !isFrontier && (
                  <>
                    <circle r={radius + 12} fill="var(--accent-warm)"
                      opacity={0.07} filter="url(#nextGlow)" className="pointer-events-none"
                    />
                    <motion.circle r={radius + 6} fill="none"
                      stroke="var(--accent-warm)" strokeWidth={1.5} className="pointer-events-none"
                      animate={{ r: [radius + 5, radius + 11, radius + 5], opacity: [0.6, 0.12, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}

                {/* ── Learning state outer ring (explicit set) ──────────────── */}
                {learningRingColor && !['mastered', 'understood', 'reviewing'].includes(tier) && (
                  <circle r={radius + 6} fill="none"
                    strokeWidth={1.5} stroke={learningRingColor} opacity={0.7}
                    className="pointer-events-none"
                  />
                )}

                {/* ── Hover ripple ──────────────────────────────────────────── */}
                <AnimatePresence>
                  {isHovered && !isSelected && (
                    <motion.circle key={`ripple-${node.id}`} r={radius}
                      fill="none" stroke={node.clusterColor ?? '#D4708A'} strokeWidth={1.5}
                      initial={{ r: radius, opacity: 0.6 }}
                      animate={{ r: radius * 2.8, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* ── Hover sparkle burst — radial spark scatter ─────────────── */}
                <AnimatePresence>
                  {isHovered && !isSelected && (
                    <>
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                        const rad  = (angle * Math.PI) / 180;
                        const dist = radius * 2.4 + 10;
                        return (
                          <motion.circle
                            key={`spark-${node.id}-${angle}`}
                            cx={0} cy={0} r={i % 2 === 0 ? 1.6 : 1.0}
                            fill={node.clusterColor ?? 'var(--accent-primary)'}
                            className="pointer-events-none"
                            initial={{ x: 0, y: 0, opacity: 0.9 }}
                            animate={{
                              x: Math.cos(rad) * dist,
                              y: Math.sin(rad) * dist,
                              opacity: 0,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.50, ease: 'easeOut', delay: i * 0.018 }}
                          />
                        );
                      })}
                    </>
                  )}
                </AnimatePresence>

                {/* ── Node body ─────────────────────────────────────────────── */}
                {/* White halo — always rendered.
                    Backdrop mode: heavy shadow filter to pop against busy images.
                    Default mode: clean white ring + stroke — no blur filter so the
                    shadow doesn't bleed into the label below. */}
                {hasBackdrop ? (
                  <motion.circle
                    initial={{ r: 0 }}
                    animate={{ r: radius + 4 }}
                    transition={{ delay: revealDelay, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    fill="rgba(255,255,255,0.92)"
                    filter="url(#nodeBackdropShadow)"
                    style={{ pointerEvents: 'none' }}
                  />
                ) : (
                  <motion.circle
                    initial={{ r: 0 }}
                    animate={{ r: radius + 3 }}
                    transition={{ delay: revealDelay, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    fill="rgba(255,255,255,0.88)"
                    stroke="rgba(255,255,255,0.60)"
                    strokeWidth={1.5}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <motion.circle
                  key={`${graph.id}-${node.id}`}
                  initial={{ r: 0 }}
                  animate={{ r: radius }}
                  transition={{ delay: revealDelay, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  style={{ transition: 'fill 250ms ease-out, stroke 250ms ease-out' }}
                />

                {/* ── Cluster pip ───────────────────────────────────────────── */}
                {isClusterModeActive && node.clusterColor && (
                  <circle r={3} fill={node.clusterColor} className="pointer-events-none" />
                )}

                {/* ── Visited dot ───────────────────────────────────────────── */}
                {visitedNodeIds.has(node.id) && !isSelected && tier !== 'mastered' && zoom > 0.5 && (
                  <circle cx={radius * 0.72} cy={radius * 0.72} r={2.5}
                    fill="var(--color-state-mastered)" opacity={0.65}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

              </g>
            );
          })}
        </g>

        {/* ── Non-selected labels ───────────────────────────────────────────── */}
        {/* Hovered node is rendered last (outside the group) so it paints on top */}
        <g className="node-labels" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {graph.nodes.filter((n) => n.id !== selectedNodeId && n.id !== hoveredNodeId).map((node) => {
            if (!activeNodeIds.has(node.id)) return null;

            const isSelected  = selectedNodeId === node.id;
            const isHovered   = hoveredNodeId  === node.id;
            const isNeighbor  = neighborNodeIds.has(node.id);
            const isEdgeEndpt = selectedEdgeNodeIds.has(node.id);
            const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;

            const ls = (learningStates[node.id] ?? 'unset') as LearningState;
            const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
            const tierCfg = TIER_CONFIG[tier];
            const radius = (node.size ?? 14) * tierCfg.radiusMult;
            const nodeDepth = selectedNodeId ? (nodeDepthMap.get(node.id) ?? 3) : 0;

            // Progressive disclosure label rules:
            // - Always: selected, hovered, neighbors, root+top-8, mastered/understood
            // - Zoom 0.8-1.3: centrality >= 0.30 + collision safe
            // - Zoom > 1.3: centrality >= 0.10 + collision safe
            const labelCentralityThreshold = zoom < 1.3 ? 0.30 : 0.10;
            const alwaysShowLabel = isSelected || isHovered || isNeighbor
              || topLabelNodeIds.has(node.id)
              || tier === 'mastered' || tier === 'understood';
            const showLabel = alwaysShowLabel
              ? true
              : (lodLevel.showLabels || (isHovered && lodLevel.showLabelsOnHover))
                && node.centrality >= labelCentralityThreshold
                && collisionSafeLabelIds.has(node.id);
            if (!(showLabel && 12 * zoom >= 8)) return null;

            // Mirror node opacity so labels fade with their node
            const distFromCenter = Math.hypot((node.x ?? 0) - graphCx, (node.y ?? 0) - graphCy);
            const depthFade = !hasSelection
              ? Math.max(hasBackdrop ? 0.82 : 0.75, 1 - (distFromCenter / graphMaxDist) * (hasBackdrop ? 0.15 : 0.18))
              : 1;
            let labelOpacity = depthFade;
            if (!hasSelection && tier === 'unexplored') labelOpacity = Math.min(labelOpacity, 0.75);
            if (hasSelection) {
              if (selectedNodeId !== null) {
                if (isNeighbor) labelOpacity = 0.85;
                else labelOpacity = 0.08;
              } else {
                labelOpacity = isEdgeEndpt ? 0.45 : 0.08;
              }
            }
            if (filteredNodeIds !== null) labelOpacity = filteredNodeIds.has(node.id) ? 1 : 0.08;

            const labelText = truncateWords(node.label, 4);
            const fontSize  = isSelected ? 13 : tier === 'mastered' ? 12 : 11;
            const labelW    = labelText.length * (fontSize * 0.52) + 14;
            const labelY    = radius + 5;
            const labelFill = isSelected ? '#5A4AAA'
              : tier === 'mastered'   ? '#3A90B8'
              : tier === 'understood' ? '#3A9870'
              : tier === 'reviewing'  ? '#B88A30'
              : isNeighbor ? '#5A5272'
              : tier === 'unexplored' ? '#857FAA'
              : '#504A6A';
            const backdropLabelFill = isSelected ? '#2A1E60' : '#251E3D';

            return (
              <g
                key={`label-${node.id}`}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                style={{ opacity: labelOpacity, transition: 'opacity 320ms ease-out' }}
                filter={hasBackdrop ? 'url(#labelShadow)' : undefined}
              >
                <rect
                  x={-labelW / 2} y={labelY + 1} width={labelW} height={fontSize + 5}
                  rx={4} fill={hasBackdrop ? 'rgba(255,255,255,0.97)' : 'rgba(245,243,251,0.90)'} opacity={1}
                />
                <text dy="1em" y={labelY} textAnchor="middle"
                  fill={hasBackdrop ? backdropLabelFill : labelFill} fontSize={fontSize}
                  fontFamily="Geist, system-ui, sans-serif"
                  fontWeight={isSelected || tier === 'mastered' ? '600' : '500'}
                  style={{ transition: 'fill 200ms ease-out' }}
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </g>

        {/* ── Hovered node label (rendered last among non-selected so it's on top) ── */}
        <g className="node-labels node-labels--hovered" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {graph.nodes.filter((n) => n.id !== selectedNodeId && n.id === hoveredNodeId).map((node) => {
            if (!activeNodeIds.has(node.id)) return null;

            const isSelected  = false; // filter ensures this is never selected
            const isNeighbor  = neighborNodeIds.has(node.id);
            const isEdgeEndpt = selectedEdgeNodeIds.has(node.id);
            const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;

            const ls = (learningStates[node.id] ?? 'unset') as LearningState;
            const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
            const tierCfg = TIER_CONFIG[tier];
            const radius = (node.size ?? 14) * tierCfg.radiusMult;

            // Hovered node label — always shown (it's the hovered node itself)
            if (!(12 * zoom >= 8)) return null;

            const distFromCenter = Math.hypot((node.x ?? 0) - graphCx, (node.y ?? 0) - graphCy);
            const depthFade = !hasSelection
              ? Math.max(hasBackdrop ? 0.82 : 0.75, 1 - (distFromCenter / graphMaxDist) * (hasBackdrop ? 0.15 : 0.18))
              : 1;
            let labelOpacity = depthFade;
            if (!hasSelection && tier === 'unexplored') labelOpacity = Math.min(labelOpacity, 0.75);
            if (hasSelection) {
              if (selectedNodeId !== null) {
                labelOpacity = isNeighbor ? 0.85 : 0.08;
              } else {
                labelOpacity = isEdgeEndpt ? 0.45 : 0.08;
              }
            }
            if (filteredNodeIds !== null) labelOpacity = filteredNodeIds.has(node.id) ? 1 : 0.08;

            const labelText = truncateWords(node.label, 4);
            const fontSize  = isSelected ? 13 : tier === 'mastered' ? 12 : 11;
            const labelW    = labelText.length * (fontSize * 0.52) + 14;
            const labelY    = radius + 5;
            const labelFill = isSelected ? '#5A4AAA'
              : tier === 'mastered'   ? '#3A90B8'
              : tier === 'understood' ? '#3A9870'
              : tier === 'reviewing'  ? '#B88A30'
              : isNeighbor ? '#5A5272'
              : tier === 'unexplored' ? '#857FAA'
              : '#504A6A';
            const backdropLabelFill = isSelected ? '#2A1E60' : '#251E3D';

            return (
              <g
                key={`label-hovered-${node.id}`}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                style={{ opacity: labelOpacity, transition: 'opacity 320ms ease-out' }}
                filter={hasBackdrop ? 'url(#labelShadow)' : undefined}
              >
                <rect
                  x={-labelW / 2} y={labelY + 1} width={labelW} height={fontSize + 5}
                  rx={4} fill={hasBackdrop ? 'rgba(255,255,255,0.97)' : 'rgba(245,243,251,0.90)'} opacity={1}
                />
                <text dy="1em" y={labelY} textAnchor="middle"
                  fill={hasBackdrop ? backdropLabelFill : labelFill} fontSize={fontSize}
                  fontFamily="Geist, system-ui, sans-serif"
                  fontWeight={isSelected || tier === 'mastered' ? '600' : '500'}
                  style={{ transition: 'fill 200ms ease-out' }}
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </g>

        <g className="nodes">
          {graph.nodes.filter((n) => n.id === selectedNodeId).map((node) => {
            if (!activeNodeIds.has(node.id)) return null;

            const isSelected    = selectedNodeId === node.id;
            const isHovered     = hoveredNodeId  === node.id;
            const isNeighbor    = neighborNodeIds.has(node.id);
            const isEdgeEndpt   = selectedEdgeNodeIds.has(node.id);
            const isFrontier    = frontierNodeIds.has(node.id);
            const isNextSuggest = node.id === nextSuggestionNodeId;
            const hasSelection  = selectedNodeId !== null || selectedEdgeId !== null;

            const ls = (learningStates[node.id] ?? 'unset') as LearningState;
            const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
            const tierCfg = TIER_CONFIG[tier];
            const radius = (node.size ?? 14) * tierCfg.radiusMult;
            const nodeDepth = selectedNodeId ? (nodeDepthMap.get(node.id) ?? 3) : 0;

            const distFromCenter = Math.hypot((node.x ?? 0) - graphCx, (node.y ?? 0) - graphCy);
            const depthFade = !hasSelection
              ? Math.max(hasBackdrop ? 0.82 : 0.75, 1 - (distFromCenter / graphMaxDist) * (hasBackdrop ? 0.15 : 0.18))
              : 1;
            let nodeOpacity = depthFade;
            if (!hasSelection && tier === 'unexplored') nodeOpacity = Math.min(nodeOpacity, 0.75);
            if (hasSelection) {
              if (selectedNodeId !== null) {
                if (isSelected || isNeighbor) nodeOpacity = 1;
                else if (nodeDepth === 2) nodeOpacity = 0.68;
                else nodeOpacity = 0.30;
              } else {
                nodeOpacity = isEdgeEndpt ? 1 : 0.12;
              }
            }
            if (filteredNodeIds !== null) nodeOpacity = filteredNodeIds.has(node.id) ? 1 : 0.08;

            let nodeFilter: string | undefined;
            if (selectedNodeId !== null) {
              if (nodeDepth === 2) nodeFilter = 'url(#depthFog-light)';
              else if (nodeDepth >= 3) nodeFilter = 'url(#depthFog-heavy)';
            }

            let fillColor: string;
            if (isSelected)    fillColor = 'url(#ng-selected)';
            else if (isEdgeEndpt || isHovered) fillColor = 'url(#ng-hover)';
            else if (tier === 'mastered' && node.clusterColor)
              fillColor = `url(#ng-mastered-${node.clusterColor.slice(1)})`;
            else if (tier === 'understood' && node.clusterColor)
              fillColor = `url(#ng-understood-${node.clusterColor.slice(1)})`;
            else if (node.clusterColor)
              fillColor = `url(#ng-${node.clusterColor.slice(1)})`;
            else fillColor = 'var(--color-node-fill)';

            let strokeColor: string;
            let strokeWidth: number;
            let strokeDash: string | undefined;
            if (isSelected) {
              strokeColor = 'var(--accent-bright)'; strokeWidth = 2;
            } else if (isEdgeEndpt) {
              strokeColor = node.clusterColor ? node.clusterColor + 'CC' : 'var(--accent-primary)'; strokeWidth = 2;
            } else if (isNextSuggest) {
              strokeColor = 'var(--accent-warm)'; strokeWidth = 1.5;
            } else if (isNeighbor) {
              strokeColor = node.clusterColor ? node.clusterColor + 'CC' : 'var(--accent-primary)'; strokeWidth = 1.8;
            } else {
              if (tier === 'mastered')        { strokeColor = '#60C0E8';    strokeWidth = 1.5; }
              else if (tier === 'understood') { strokeColor = '#60C898CC';  strokeWidth = 1.2; }
              else if (tier === 'reviewing')  { strokeColor = '#D4A84099';  strokeWidth = 1.0; }
              else if (tier === 'unexplored') {
                strokeColor = node.clusterColor ? node.clusterColor + '40' : 'rgba(123,110,196,0.22)';
                strokeWidth = 0.7; strokeDash = '3 2';
              } else {
                strokeColor = node.clusterColor ? node.clusterColor + 'AA' : 'var(--color-node-ring)';
                strokeWidth = 1;
              }
            }

            const glowColor   = node.clusterColor ?? 'var(--accent-primary)';
            const isCore      = node.centrality >= 0.65;
            const isImportant = node.centrality >= 0.4 && node.centrality < 0.65;
            const revealDelay = nodeRevealDelay.get(node.id) ?? 0;
            const learningRingColor = ls === 'unset' ? null
              : ls === 'understood' ? 'var(--color-state-understood)'
              : ls === 'reviewing'  ? 'var(--color-state-reviewing)'
              : ls === 'weak'       ? 'var(--color-state-weak)'
              : ls === 'mastered'   ? 'var(--color-state-mastered)'
              : null;

            return (
              <g
                key={`sel-body-${node.id}`}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id, e.shiftKey); }}
                onDoubleClick={(e) => { e.stopPropagation(); handleNodeDoubleClick(node.id); }}
                onMouseEnter={() => hoverNode(node.id)}
                onMouseLeave={() => hoverNode(null)}
                role="button"
                aria-label={`Concept: ${node.label}`}
                tabIndex={0}
                style={{ opacity: nodeOpacity, filter: nodeFilter, transition: 'opacity 320ms ease-out, filter 320ms ease-out', outline: 'none' }}
              >
                {/* Strong outer glow — clearly outshines neighbor halos */}
                <circle r={radius + 22} fill="var(--accent-primary)"
                  opacity={0.18} filter="url(#nodeGlow)" className="pointer-events-none"
                />

                {/* Centrality glow (selected gets full brightness, not dimmed) */}
                {isCore && (
                  <circle r={radius + 18} fill={glowColor}
                    opacity={0.14} filter="url(#nodeGlow)" className="pointer-events-none" />
                )}
                {isImportant && (
                  <circle r={radius + 14} fill={glowColor}
                    opacity={0.10} filter="url(#nodeGlow)" className="pointer-events-none" />
                )}

                {/* Learning state ring */}
                {learningRingColor && !['mastered', 'understood', 'reviewing'].includes(tier) && (
                  <circle r={radius + 6} fill="none"
                    strokeWidth={1.5} stroke={learningRingColor} opacity={0.7}
                    className="pointer-events-none" />
                )}

                {/* Selection ring — bounces out from node edge on select */}
                <motion.circle fill="none"
                  stroke="var(--accent-primary)" strokeWidth={2.5} strokeOpacity={0.55}
                  className="pointer-events-none"
                  initial={{ r: radius }} animate={{ r: radius + 8 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                />
                {/* Inner selection ring */}
                <motion.circle fill="none"
                  stroke="var(--accent-bright)" strokeWidth={1.5} opacity={0.55}
                  className="pointer-events-none"
                  initial={{ r: radius }} animate={{ r: radius + 5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                />

                {/* White halo — bounces out from node edge */}
                {hasBackdrop ? (
                  <motion.circle
                    initial={{ r: radius }} animate={{ r: radius + 4 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    fill="rgba(255,255,255,0.92)" filter="url(#nodeBackdropShadow)"
                    style={{ pointerEvents: 'none' }}
                  />
                ) : (
                  <motion.circle
                    initial={{ r: radius }} animate={{ r: radius + 3 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    fill="rgba(255,255,255,0.88)" stroke="rgba(255,255,255,0.60)" strokeWidth={1.5}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Node body */}
                <circle r={radius}
                  fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  style={{ transition: 'fill 250ms ease-out, stroke 250ms ease-out' }}
                />
              </g>
            );
          })}
        </g>

        {/* ── Selected node label ───────────────────────────────────────────── */}
        <g className="node-labels" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {graph.nodes.filter((n) => n.id === selectedNodeId).map((node) => {
            if (!activeNodeIds.has(node.id)) return null;

            const isSelected  = true;
            const isNeighbor  = false;
            const ls = (learningStates[node.id] ?? 'unset') as LearningState;
            const tier: VisualTier = LEARNING_STATE_TO_TIER[ls] ?? 'visited';
            const tierCfg = TIER_CONFIG[tier];
            const radius = (node.size ?? 14) * tierCfg.radiusMult;

            const labelText = truncateWords(node.label, 4);
            const fontSize  = 13;
            const labelW    = labelText.length * (fontSize * 0.52) + 14;
            const labelY    = radius + 5;
            const labelFill = '#5A4AAA';
            const backdropLabelFill = '#2A1E60';

            return (
              <g
                key={`sel-label-${node.id}`}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                filter={hasBackdrop ? 'url(#labelShadow)' : undefined}
              >
                <rect
                  x={-labelW / 2} y={labelY + 1} width={labelW} height={fontSize + 5}
                  rx={4} fill={hasBackdrop ? 'rgba(255,255,255,0.97)' : 'rgba(245,243,251,0.90)'} opacity={1}
                />
                <text dy="1em" y={labelY} textAnchor="middle"
                  fill={hasBackdrop ? backdropLabelFill : labelFill} fontSize={fontSize}
                  fontFamily="Geist, system-ui, sans-serif" fontWeight="600"
                  style={{ transition: 'fill 200ms ease-out' }}
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

// ─── Edge Label Pill ──────────────────────────────────────────────────────────
// Labels use semantic type accent colors (from edge-config) for the text and
// border — this is UI chrome, not the edge stroke itself.

interface EdgeLabelPillProps {
  edge: { id: string; label: string; sourceId: string; targetId: string };
  sourceNode: { x?: number; y?: number };
  targetNode: { x?: number; y?: number };
  semType: SemanticEdgeType | 'default';
}

function EdgeLabelPill({ edge, sourceNode, targetNode, semType }: EdgeLabelPillProps) {
  const midX = ((sourceNode.x ?? 0) + (targetNode.x ?? 0)) / 2;
  const midY = ((sourceNode.y ?? 0) + (targetNode.y ?? 0)) / 2;
  const labelColor = semanticColor(semType !== 'default' ? semType as SemanticEdgeType : undefined);
  const text = (edge.label ? truncateWords(edge.label, 4) : null)
    ?? SEMANTIC_TYPE_ABBR[semType as SemanticEdgeType]
    ?? '';
  const width = text.length * 6.5 + 16;
  return (
    <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
      <rect x={-width / 2} y={-9} width={width} height={18} rx={4}
        fill="rgba(245, 243, 251, 0.92)" stroke={labelColor + '55'} strokeWidth={0.8} opacity={1}
      />
      <text textAnchor="middle" dy="0.35em" fill={labelColor} fontSize={9}
        fontFamily="Geist, system-ui, sans-serif" fontWeight="500" letterSpacing="0.04em"
      >
        {text}
      </text>
    </g>
  );
}
