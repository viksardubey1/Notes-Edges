'use client';

/**
 * HeroGraph — Notes & Edges Landing Page
 *
 * Interactive animated knowledge graph demo.
 * Light theme: white node fills, lavender accents, soft lavender edges.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { truncateWords } from '@/lib/utils';

// ─── Light theme color palette ────────────────────────────────────────────────

const ACCENT   = '#7B6EC4';
const ACCENT_GLOW = 'rgba(123,110,196,0.14)';
const EDGE_DEFAULT = 'rgba(123,110,196,0.28)';
const EDGE_ACTIVE  = '#7B6EC4';
const NODE_FILL    = '#FFFFFF';
const NODE_HOVER   = '#EEEAF8';
const NODE_SELECTED = '#7B6EC4';
const LABEL_PRIMARY = '#251E3D';
const LABEL_MUTED   = '#9C95B5';
const PILL_BG       = 'rgba(245,243,251,0.96)';

const CLUSTER_COLORS: Record<string, string> = {
  a: '#7B6EC4',
  b: '#3FA882',
  c: '#C4923A',
};

// ─── Graph Data ───────────────────────────────────────────────────────────────

interface DemoNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  cluster: 'a' | 'b' | 'c';
}

interface DemoEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  label: string;
}

const NODES: DemoNode[] = [
  { id: 'neural-nets',      label: 'Neural Networks',     x: 345, y: 158, size: 22, cluster: 'a' },
  { id: 'deep-learning',    label: 'Deep Learning',       x: 220, y: 210, size: 16, cluster: 'a' },
  { id: 'backprop',         label: 'Backpropagation',     x: 358, y: 78,  size: 13, cluster: 'a' },
  { id: 'feature-learning', label: 'Feature Learning',    x: 462, y: 222, size: 13, cluster: 'a' },
  { id: 'transformer',      label: 'Transformer',         x: 570, y: 140, size: 19, cluster: 'b' },
  { id: 'attention',        label: 'Attention',           x: 610, y: 248, size: 16, cluster: 'b' },
  { id: 'self-attention',   label: 'Self-Attention',      x: 566, y: 340, size: 12, cluster: 'b' },
  { id: 'embeddings',       label: 'Embeddings',          x: 468, y: 388, size: 13, cluster: 'b' },
  { id: 'gradient-descent', label: 'Gradient Descent',    x: 128, y: 172, size: 16, cluster: 'c' },
  { id: 'loss-function',    label: 'Loss Function',       x: 78,  y: 280, size: 13, cluster: 'c' },
  { id: 'overfitting',      label: 'Overfitting',         x: 208, y: 340, size: 12, cluster: 'c' },
  { id: 'regularization',   label: 'Regularization',      x: 118, y: 408, size: 11, cluster: 'c' },
  { id: 'training-data',    label: 'Training Data',       x: 322, y: 396, size: 14, cluster: 'c' },
  { id: 'dropout',          label: 'Dropout',             x: 220, y: 438, size: 10, cluster: 'c' },
  { id: 'knowledge-graph',  label: 'Knowledge Graph',     x: 388, y: 308, size: 12, cluster: 'a' },
];

const EDGES: DemoEdge[] = [
  { id: 'e1',  source: 'neural-nets',      target: 'deep-learning',    weight: 0.9,  label: 'is a type of' },
  { id: 'e2',  source: 'neural-nets',      target: 'backprop',         weight: 0.8,  label: 'trained via' },
  { id: 'e3',  source: 'neural-nets',      target: 'feature-learning', weight: 0.7,  label: 'enables' },
  { id: 'e4',  source: 'neural-nets',      target: 'transformer',      weight: 0.85, label: 'evolved into' },
  { id: 'e5',  source: 'neural-nets',      target: 'gradient-descent', weight: 0.8,  label: 'optimized by' },
  { id: 'e6',  source: 'transformer',      target: 'attention',        weight: 0.95, label: 'uses' },
  { id: 'e7',  source: 'attention',        target: 'self-attention',   weight: 0.9,  label: 'variant' },
  { id: 'e8',  source: 'self-attention',   target: 'embeddings',       weight: 0.7,  label: 'operates on' },
  { id: 'e9',  source: 'backprop',         target: 'gradient-descent', weight: 0.9,  label: 'computes' },
  { id: 'e10', source: 'gradient-descent', target: 'loss-function',    weight: 0.95, label: 'minimizes' },
  { id: 'e11', source: 'deep-learning',    target: 'overfitting',      weight: 0.7,  label: 'risks' },
  { id: 'e12', source: 'overfitting',      target: 'regularization',   weight: 0.9,  label: 'prevented by' },
  { id: 'e13', source: 'regularization',   target: 'dropout',          weight: 0.8,  label: 'technique' },
  { id: 'e14', source: 'feature-learning', target: 'embeddings',       weight: 0.8,  label: 'produces' },
  { id: 'e15', source: 'embeddings',       target: 'knowledge-graph',  weight: 0.7,  label: 'represents in' },
  { id: 'e16', source: 'training-data',    target: 'overfitting',      weight: 0.7,  label: 'causes' },
  { id: 'e17', source: 'training-data',    target: 'deep-learning',    weight: 0.8,  label: 'feeds' },
  { id: 'e18', source: 'knowledge-graph',  target: 'transformer',      weight: 0.6,  label: 'informs' },
  { id: 'e19', source: 'loss-function',    target: 'backprop',         weight: 0.8,  label: 'signals' },
  { id: 'e20', source: 'training-data',    target: 'embeddings',       weight: 0.65, label: 'encoded as' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNeighbors(nodeId: string): Set<string> {
  const neighbors = new Set<string>();
  for (const edge of EDGES) {
    if (edge.source === nodeId) neighbors.add(edge.target);
    if (edge.target === nodeId) neighbors.add(edge.source);
  }
  return neighbors;
}

function getConnectedEdges(nodeId: string): Set<string> {
  const ids = new Set<string>();
  for (const edge of EDGES) {
    if (edge.source === nodeId || edge.target === nodeId) ids.add(edge.id);
  }
  return ids;
}

function getNodeById(id: string): DemoNode | undefined {
  return NODES.find((n) => n.id === id);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroGraph() {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const neighborIds = selectedNodeId ? getNeighbors(selectedNodeId) : null;
  const connectedEdgeIds = selectedNodeId ? getConnectedEdges(selectedNodeId) : null;

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const nodeDelay = (index: number) => (prefersReducedMotion ? 0 : index * 0.07);
  const edgeDelay = (index: number) => prefersReducedMotion ? 0 : NODES.length * 0.07 + index * 0.04;

  return (
    <div className="relative w-full h-full select-none">
      <div
        className={mounted && !prefersReducedMotion ? 'ambient-float' : ''}
        style={{ width: '100%', height: '100%' }}
      >
        <svg
          viewBox="50 40 620 450"
          width="100%"
          height="100%"
          onClick={handleCanvasClick}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Interactive knowledge graph demo"
          role="img"
          style={{ cursor: selectedNodeId ? 'default' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <defs>
            <radialGradient id="lp-glow-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={CLUSTER_COLORS.a} stopOpacity="0.09" />
              <stop offset="100%" stopColor={CLUSTER_COLORS.a} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lp-glow-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={CLUSTER_COLORS.b} stopOpacity="0.07" />
              <stop offset="100%" stopColor={CLUSTER_COLORS.b} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lp-glow-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={CLUSTER_COLORS.c} stopOpacity="0.08" />
              <stop offset="100%" stopColor={CLUSTER_COLORS.c} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cluster ambient glows */}
          <ellipse cx="350" cy="170" rx="160" ry="120" fill="url(#lp-glow-a)" />
          <ellipse cx="580" cy="260" rx="130" ry="130" fill="url(#lp-glow-b)" />
          <ellipse cx="150" cy="310" rx="140" ry="130" fill="url(#lp-glow-c)" />

          {/* ── Edges ──────────────────────────────────────────────────────── */}
          <g>
            {EDGES.map((edge, i) => {
              const src = getNodeById(edge.source);
              const tgt = getNodeById(edge.target);
              if (!src || !tgt) return null;

              const isConnected = connectedEdgeIds?.has(edge.id) ?? false;
              const isHovered = hoveredEdgeId === edge.id;
              const hasSelection = selectedNodeId !== null;

              const opacity = hasSelection
                ? isConnected ? 0.90 : 0.04
                : isHovered ? 0.75 : edge.weight >= 0.8 ? 0.55 : edge.weight >= 0.6 ? 0.35 : 0.18;

              const strokeColor = isConnected ? EDGE_ACTIVE : EDGE_DEFAULT;
              const strokeWidth = isConnected ? 1.5 : edge.weight >= 0.8 ? 1.2 : 0.8;
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={edge.id}>
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke="transparent" strokeWidth={14}
                    style={{ cursor: 'default' }}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  />
                  <motion.path
                    d={`M ${src.x},${src.y} L ${tgt.x},${tgt.y}`}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity, stroke: strokeColor }}
                    transition={{
                      pathLength: { duration: 0.5, delay: edgeDelay(i), ease: 'easeInOut' },
                      opacity: { duration: 0.3, delay: edgeDelay(i) },
                      stroke: { duration: 0.2 },
                    }}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  />

                  {/* Edge label pill */}
                  <AnimatePresence>
                    {(isHovered || isConnected) && edge.label && (
                      <motion.g
                        key={`label-${edge.id}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        transform={`translate(${midX}, ${midY})`}
                        style={{ pointerEvents: 'none' }}
                      >
                        <rect x={-30} y={-9} width={60} height={18} rx={4}
                          fill={PILL_BG} stroke="rgba(123,110,196,0.18)" strokeWidth={0.8} />
                        <text textAnchor="middle" dy="0.35em"
                          fill={LABEL_MUTED} fontSize={9}
                          fontFamily="Geist, system-ui, sans-serif">
                          {truncateWords(edge.label, 3)}
                        </text>
                      </motion.g>
                    )}
                  </AnimatePresence>
                </g>
              );
            })}
          </g>

          {/* ── Nodes ──────────────────────────────────────────────────────── */}
          <g>
            {NODES.map((node, i) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isNeighbor = neighborIds?.has(node.id) ?? false;
              const hasSelection = selectedNodeId !== null;

              const nodeOpacity = hasSelection ? (isSelected || isNeighbor ? 1 : 0.18) : 1;

              const fillColor = isSelected
                ? NODE_SELECTED
                : isHovered ? NODE_HOVER : NODE_FILL;

              const ringColor = isSelected
                ? ACCENT
                : isNeighbor
                  ? ACCENT + '88'
                  : CLUSTER_COLORS[node.cluster] + '66';

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: nodeOpacity, scale: 1 }}
                  transition={{
                    opacity: { duration: 0.3, delay: nodeDelay(i) },
                    scale: {
                      duration: prefersReducedMotion ? 0 : 0.35,
                      delay: nodeDelay(i),
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                    },
                  }}
                  style={{ originX: `${node.x}px`, originY: `${node.y}px`, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  role="button"
                  aria-label={`Knowledge node: ${node.label}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNodeClick(node.id); }
                  }}
                >
                  {/* Selection glow halo */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.circle
                        cx={node.x} cy={node.y}
                        initial={{ r: node.size, opacity: 0 }}
                        animate={{ r: node.size + 10, opacity: 1 }}
                        exit={{ r: node.size, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        fill={ACCENT_GLOW}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Cluster color ring */}
                  <circle
                    cx={node.x} cy={node.y} r={node.size + 3}
                    fill="none" stroke={ringColor} strokeWidth={1.5}
                    style={{ transition: 'stroke 200ms ease-out', pointerEvents: 'none' }}
                  />

                  {/* Node fill */}
                  <circle
                    cx={node.x} cy={node.y} r={node.size}
                    fill={fillColor}
                    stroke="rgba(123,110,196,0.18)"
                    strokeWidth={0.8}
                    style={{ transition: 'fill 200ms ease-out' }}
                  />

                  {/* Cluster color dot */}
                  <circle
                    cx={node.x} cy={node.y} r={Math.max(3, node.size * 0.25)}
                    fill={CLUSTER_COLORS[node.cluster]}
                    opacity={isSelected ? 0 : 0.65}
                    style={{ pointerEvents: 'none', transition: 'opacity 200ms' }}
                  />

                  {/* Node label */}
                  <text
                    x={node.x} y={node.y + node.size + 12}
                    textAnchor="middle"
                    fill={isSelected || isNeighbor ? LABEL_PRIMARY : LABEL_MUTED}
                    fontSize={isSelected ? 11 : 10}
                    fontFamily="Geist, system-ui, sans-serif"
                    fontWeight="500"
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 200ms ease-out' }}
                  >
                    {truncateWords(node.label, 3)}
                  </text>
                </motion.g>
              );
            })}
          </g>

          {/* Click hint */}
          <AnimatePresence>
            {!selectedNodeId && (
              <motion.text
                x="340" y="478"
                textAnchor="middle"
                fill={LABEL_MUTED}
                fontSize={11}
                fontFamily="Geist, system-ui, sans-serif"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: NODES.length * 0.07 + 1 }}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                Click any node to explore connections
              </motion.text>
            )}
          </AnimatePresence>
        </svg>
      </div>
    </div>
  );
}
