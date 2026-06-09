/**
 * ConceptExpansion — Notes & Edges
 *
 * Spatial right-side knowledge panel — slides in from the canvas edge.
 * The graph stays alive behind it: no scrim, no blur.
 * A visual tether (rendered in GraphCanvas) connects the node to the panel.
 *
 * Layout: single-column, ~440px wide, right-anchored with 20px margin.
 * Navigation: interactive ConstellationMap replaces static connection lists.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useUIStore } from '@/store/ui.store';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import type { GraphNode, SemanticEdgeType, LearningState } from '@/types/graph';
import { buildTraversalOrder } from '@/lib/traversal';
import { SEMANTIC_TYPE_CONFIG } from '@/lib/graph/edge-config';

// Derived from the single source of truth in edge-config.ts.
const SEM_TYPE_LABELS: Partial<Record<SemanticEdgeType, string>> = Object.fromEntries(
  Object.entries(SEMANTIC_TYPE_CONFIG).map(([k, v]) => [k, v.verb]),
) as Partial<Record<SemanticEdgeType, string>>;

const SEM_TYPE_COLORS: Partial<Record<SemanticEdgeType, string>> = Object.fromEntries(
  Object.entries(SEMANTIC_TYPE_CONFIG).map(([k, v]) => [k, v.color]),
) as Partial<Record<SemanticEdgeType, string>>;

// ── Learning state config ─────────────────────────────────────────────────────

const LEARNING_CONFIG: Record<Exclude<LearningState, 'unset'>, {
  label: string; color: string; bg: string; border: string;
}> = {
  weak:       { label: 'Struggling', color: '#E06070', bg: 'rgba(224,96,112,0.12)',  border: 'rgba(224,96,112,0.30)' },
  reviewing:  { label: 'Reviewing',  color: '#D4A840', bg: 'rgba(212,168,64,0.12)',  border: 'rgba(212,168,64,0.30)'  },
  understood: { label: 'Got it',     color: '#60C898', bg: 'rgba(96,200,152,0.12)',  border: 'rgba(96,200,152,0.30)'  },
  mastered:   { label: 'Mastered',   color: '#60C0E8', bg: 'rgba(96,192,232,0.12)',  border: 'rgba(96,192,232,0.30)'  },
};

const LEARNING_ORDER: Exclude<LearningState, 'unset'>[] = ['weak', 'reviewing', 'understood', 'mastered'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConnectionEdge {
  id: string;
  weight: number;
  semanticType?: SemanticEdgeType;
}

interface Connection {
  edge: ConnectionEdge;
  other: GraphNode;
  direction: 'in' | 'out';
}

// ── ConstellationMap — interactive mini-graph ─────────────────────────────────

function ConstellationMap({
  node,
  connections,
  onNavigate,
}: {
  node: GraphNode;
  connections: Connection[];
  onNavigate: (nodeId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const viewW = 120;
  const viewH = 120;
  const cx = viewW / 2;
  const cy = viewH / 2;
  const orbitR = 42;
  const color = node.clusterColor ?? '#9876EE';
  const visible = connections.slice(0, 8);
  const angleStep = (2 * Math.PI) / Math.max(1, visible.length);

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      width={viewW}
      height={viewH}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={`Connections for ${node.label}`}
    >
      {/* Outer atmospheric glow */}
      <circle cx={cx} cy={cy} r={orbitR + 18} fill={color} opacity={0.04} style={{ filter: 'blur(14px)' }} />

      {/* Dashed orbit ring */}
      <circle
        cx={cx} cy={cy} r={orbitR}
        fill="none" stroke={color} strokeWidth={0.6} opacity={0.18} strokeDasharray="3 4"
      />

      {/* Connection lines + satellite nodes */}
      {visible.map((conn, i) => {
        const a = i * angleStep - Math.PI / 2;
        const tx = cx + Math.cos(a) * orbitR;
        const ty = cy + Math.sin(a) * orbitR;
        const c = conn.other.clusterColor ?? color;
        const isHovered = hoveredId === conn.other.id;
        const label = conn.other.label.length > 14
          ? conn.other.label.slice(0, 13) + '…'
          : conn.other.label;
        const semType = conn.edge.semanticType;
        const relColor = semType ? (SEM_TYPE_COLORS[semType] ?? c) : c;

        // Label positioning: push away from center
        const labelAngle = a;
        const labelOffset = 13;
        const lx = cx + Math.cos(labelAngle) * (orbitR + labelOffset);
        const ly = cy + Math.sin(labelAngle) * (orbitR + labelOffset);
        const textAnchor = Math.abs(Math.cos(labelAngle)) < 0.3
          ? 'middle'
          : Math.cos(labelAngle) > 0 ? 'start' : 'end';

        return (
          <g
            key={conn.edge.id}
            onClick={() => onNavigate(conn.other.id)}
            onMouseEnter={() => setHoveredId(conn.other.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ cursor: 'pointer', outline: 'none' }}
            role="button"
            aria-label={`Navigate to ${conn.other.label}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate(conn.other.id)}
          >
            {/* Edge line */}
            <line
              x1={cx} y1={cy} x2={tx} y2={ty}
              stroke={relColor}
              strokeWidth={isHovered ? 1.2 : 0.7}
              opacity={isHovered ? 0.60 : 0.22}
              style={{ transition: 'all 0.15s ease' }}
            />
            {/* Satellite glow */}
            <circle cx={tx} cy={ty} r={isHovered ? 10 : 7} fill={c} opacity={0.07} style={{ transition: 'r 0.15s ease' }} />
            {/* Satellite node */}
            <circle
              cx={tx} cy={ty}
              r={isHovered ? 6 : 4.5}
              fill={c}
              opacity={isHovered ? 0.85 : 0.55}
              stroke={c}
              strokeWidth={0.6}
              style={{ transition: 'all 0.15s ease' }}
            />
            {/* Node label */}
            <text
              x={lx} y={ly + 1}
              textAnchor={textAnchor}
              fill="rgba(90,82,114,0.70)"
              fontSize={isHovered ? 7.5 : 6.5}
              fontFamily="var(--font-sans, sans-serif)"
              style={{ transition: 'font-size 0.15s ease, fill 0.15s ease', userSelect: 'none', pointerEvents: 'none' }}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Center node — atmospheric glow layers */}
      <circle cx={cx} cy={cy} r={22} fill={color} opacity={0.06} style={{ filter: 'blur(8px)' }} />
      <circle cx={cx} cy={cy} r={16} fill={`${color}25`} />
      <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.55} stroke={color} strokeWidth={1.2} />
      {/* Inner glass highlight */}
      <circle cx={cx - 4} cy={cy - 4} r={4} fill="rgba(255,255,255,0.25)" style={{ filter: 'blur(2px)' }} />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConceptExpansion() {
  const [connectionsExpanded, setConnectionsExpanded] = useState(false);

  const {
    graph,
    selectedNodeId,
    learningStates,
    setLearningState,
    navigationHistory,
    navigateBack,
    clearSelection,
  } = useGraphStore();

  const { closeNodeDetail } = useUIStore();
  const { navigateToNode } = useGraphInteractions();

  const node = useMemo(
    () => graph?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  );

  const connectedEdges = useMemo((): Connection[] => {
    if (!graph || !selectedNodeId || !node) return [];
    const result: Connection[] = [];
    for (const e of graph.edges) {
      if (e.sourceId !== selectedNodeId && e.targetId !== selectedNodeId) continue;
      const otherId = e.sourceId === selectedNodeId ? e.targetId : e.sourceId;
      const other = graph.nodes.find((n) => n.id === otherId);
      if (!other) continue;
      result.push({
        edge: {
          id: e.id,
          weight: e.weight,
          semanticType: e.semanticType as SemanticEdgeType | undefined,
        },
        other,
        direction: e.sourceId === selectedNodeId ? 'out' : 'in',
      });
    }
    return result.sort((a, b) => b.edge.weight - a.edge.weight);
  }, [graph, selectedNodeId, node]);

  // Stable topological order across the whole graph — circular linked list
  const traversalOrder = useMemo(() => {
    if (!graph) return [];
    return buildTraversalOrder(graph.nodes, graph.edges);
  }, [graph]);

  const traversalIdx = useMemo(() => {
    if (!node || traversalOrder.length === 0) return 0;
    const idx = traversalOrder.indexOf(node.id);
    return idx === -1 ? 0 : idx;
  }, [node, traversalOrder]);

  const nextNode = useMemo(() => {
    if (!graph || !node || traversalOrder.length < 2) return null;
    const nextId = traversalOrder[(traversalIdx + 1) % traversalOrder.length];
    return graph.nodes.find((n) => n.id === nextId) ?? null;
  }, [graph, node, traversalIdx, traversalOrder]);

  const prevNode = useMemo(() => {
    if (!graph || !node || traversalOrder.length < 2) return null;
    const prevId = traversalOrder[(traversalIdx - 1 + traversalOrder.length) % traversalOrder.length];
    return graph.nodes.find((n) => n.id === prevId) ?? null;
  }, [graph, node, traversalIdx, traversalOrder]);

  const learningState: LearningState = (learningStates[selectedNodeId ?? ''] ?? 'unset') as LearningState;
  const accentRaw = node?.clusterColor ?? '#9876EE';

  const prevNodeId = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
  const historyPrevNode = prevNodeId ? graph?.nodes.find((n) => n.id === prevNodeId) ?? null : null;

  // Reset expanded state when node changes
  useEffect(() => {
    setConnectionsExpanded(false);
  }, [selectedNodeId]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedNodeId) return;
      // Don't hijack when typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        clearSelection();
        closeNodeDetail();
      } else if (e.key === 'ArrowRight' && nextNode) {
        e.preventDefault();
        navigateToNode(nextNode.id);
      } else if (e.key === 'ArrowLeft' && prevNode) {
        e.preventDefault();
        navigateToNode(prevNode.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, nextNode, prevNode, clearSelection, closeNodeDetail, navigateToNode]);

  const handleClose = () => {
    clearSelection();
    closeNodeDetail();
  };

  return (
    <AnimatePresence>
      {selectedNodeId && node && (
        <motion.div
          key={`panel-${node.id}`}
          className="absolute flex flex-col overflow-hidden pointer-events-auto"
          style={{
            top: 20,
            right: 20,
            bottom: 20,
            width: 'min(440px, 38%)',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(40px) saturate(130%)',
            WebkitBackdropFilter: 'blur(40px) saturate(130%)',
            border: '1px solid rgba(123, 110, 196, 0.14)',
            boxShadow: `
              0 0 0 1px rgba(123,110,196,0.06),
              0 16px 56px rgba(37,30,61,0.12),
              0 4px 16px rgba(37,30,61,0.06)
            `,
            zIndex: 30,
          }}
          initial={{ x: 56, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Cluster color strip — left edge accent */}
          <div
            className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${accentRaw} 30%, ${accentRaw} 70%, transparent 100%)`,
              opacity: 0.50,
            }}
          />

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-2"
          >
            {/* Back button */}
            {historyPrevNode ? (
              <motion.button
                onClick={() => navigateBack()}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-[8px]"
                style={{ color: 'var(--text-muted)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.07)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <ArrowLeft size={11} />
                <span className="truncate max-w-[130px]">{historyPrevNode.label}</span>
              </motion.button>
            ) : (
              <div />
            )}

            {/* Close */}
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
              style={{ color: 'var(--text-muted)', background: 'rgba(123,110,196,0.06)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              <X size={12} />
            </button>
          </div>

          {/* ── Title area + Constellation Map (side by side) ───────────── */}
          <div className="flex-shrink-0 px-5 pb-3 relative overflow-hidden">
            {/* Subtle radial backdrop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 90% 100% at 20% 60%, ${accentRaw}0E 0%, transparent 70%)`,
              }}
              aria-hidden="true"
            />

            <div className="relative flex items-start gap-3">
              {/* LEFT: badges + title + teaser */}
              <div className="flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  {node.clusterName && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: `${accentRaw}18`,
                        color: accentRaw,
                        border: `1px solid ${accentRaw}35`,
                      }}
                    >
                      <span className="w-1 h-1 rounded-full" style={{ background: accentRaw }} />
                      {node.clusterName}
                    </span>
                  )}
                  {learningState !== 'unset' && (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: LEARNING_CONFIG[learningState as Exclude<LearningState, 'unset'>].bg,
                        color: LEARNING_CONFIG[learningState as Exclude<LearningState, 'unset'>].color,
                        border: `1px solid ${LEARNING_CONFIG[learningState as Exclude<LearningState, 'unset'>].border}`,
                      }}
                    >
                      {LEARNING_CONFIG[learningState as Exclude<LearningState, 'unset'>].label}
                    </span>
                  )}
                </div>

                {/* Concept title */}
                <h2
                  className="font-light leading-tight tracking-tight mb-1.5"
                  style={{ fontSize: 22, color: 'var(--text-primary)' }}
                >
                  {node.label}
                </h2>

                {/* Summary teaser */}
                {node.metadata?.summary && (
                  <p
                    className="font-light leading-relaxed line-clamp-2"
                    style={{ fontSize: 12.5, color: 'var(--text-muted)' }}
                  >
                    {node.metadata.summary}
                  </p>
                )}
              </div>

              {/* RIGHT: ConstellationMap — compact, tucked to the side */}
              {connectedEdges.length > 0 && (
                <div
                  className="flex-shrink-0 rounded-[10px] overflow-hidden -mt-1"
                  style={{
                    background: `${accentRaw}07`,
                    border: `1px solid ${accentRaw}14`,
                  }}
                >
                  <ConstellationMap
                    node={node}
                    connections={connectedEdges}
                    onNavigate={(id) => navigateToNode(id)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Separator */}
          <div
            className="flex-shrink-0 mx-5 my-1"
            style={{ height: 1, background: 'rgba(123,110,196,0.10)' }}
          />

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div
            className="flex-1 min-h-0 px-5 pt-3 pb-4 flex flex-col gap-3 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* The Idea */}
            {node.metadata?.summary && (
              <div className="flex flex-col gap-1">
                <p
                  className="text-[8px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: accentRaw, opacity: 0.55 }}
                >
                  The Idea
                </p>
                <div
                  className="px-4 py-4 rounded-[12px]"
                  style={{
                    background: `${accentRaw}08`,
                    border: `1px solid ${accentRaw}14`,
                  }}
                >
                  <p
                    className="font-light leading-[1.80]"
                    style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}
                  >
                    {node.metadata.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Why It Matters */}
            {node.metadata?.whyItMatters && (
              <div className="flex-shrink-0 flex flex-col gap-1">
                <p
                  className="text-[8px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: accentRaw, opacity: 0.55 }}
                >
                  Why It Matters
                </p>
                <div
                  className="px-3.5 py-3 rounded-[10px]"
                  style={{
                    background: 'rgba(123,110,196,0.03)',
                    borderLeft: `2px solid ${accentRaw}55`,
                  }}
                >
                  <p
                    className="italic leading-relaxed"
                    style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}
                  >
                    {node.metadata.whyItMatters}
                  </p>
                </div>
              </div>
            )}

            {/* Source quote */}
            {node.metadata?.sourceQuote && (
              <blockquote
                className="flex-shrink-0 px-3.5 py-3 rounded-[10px] italic leading-relaxed"
                style={{
                  fontSize: 12,
                  background: 'rgba(123,110,196,0.03)',
                  borderLeft: `1.5px solid ${accentRaw}30`,
                  color: 'var(--text-muted)',
                }}
              >
                {node.metadata.sourceQuote}
              </blockquote>
            )}

            {/* Tags */}
            {Array.isArray(node.metadata?.expansionSuggestions) &&
              (node.metadata.expansionSuggestions as string[]).length > 0 && (
              <div className="flex-shrink-0 flex flex-wrap gap-1.5">
                {(node.metadata.expansionSuggestions as string[]).slice(0, 5).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-[9px] font-medium"
                    style={{
                      background: 'rgba(123,110,196,0.06)',
                      border: '1px solid rgba(123,110,196,0.12)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Next Idea CTA ─────────────────────────────────────────────── */}
            {nextNode && (
              <div className="flex-shrink-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p
                    className="text-[8px] font-semibold tracking-[0.14em] uppercase flex items-center gap-1.5"
                    style={{ color: accentRaw, opacity: 0.9 }}
                  >
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'flex' }}
                    >
                      <ArrowRight size={8} />
                    </motion.span>
                    Next Up
                  </p>
                  {traversalOrder.length > 1 && (
                    <span className="text-[8px] tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.35 }}>
                      {traversalIdx + 1}/{traversalOrder.length}
                    </span>
                  )}
                </div>
                {(() => {
                  const tc = nextNode.clusterColor ?? accentRaw;
                  return (
                    <motion.div
                      animate={{
                        boxShadow: [
                          `0 0 0 0px ${tc}00`,
                          `0 0 0 4px ${tc}22`,
                          `0 0 0 0px ${tc}00`,
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="rounded-[10px]"
                    >
                    <motion.button
                      onClick={() => navigateToNode(nextNode.id)}
                      className="w-full rounded-[10px] overflow-hidden text-left"
                      style={{
                        background: `linear-gradient(145deg, ${tc}18 0%, ${tc}08 100%)`,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                      animate={{
                        borderColor: [`${tc}40`, `${tc}90`, `${tc}40`],
                        boxShadow: [
                          `0 2px 12px ${tc}10`,
                          `0 2px 20px ${tc}35`,
                          `0 2px 12px ${tc}10`,
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <div className="px-3.5 py-3 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tc, boxShadow: `0 0 8px ${tc}` }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold leading-tight truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                            {nextNode.label}
                          </p>
                          {nextNode.metadata?.summary && (
                            <p className="text-[11px] leading-snug mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                              {nextNode.metadata.summary}
                            </p>
                          )}
                        </div>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight size={13} style={{ color: tc, opacity: 0.85, flexShrink: 0 }} />
                        </motion.div>
                      </div>
                    </motion.button>
                    </motion.div>
                  );
                })()}
              </div>
            )}

            {/* ── Your Understanding ─────────────────────────────────────────── */}
            <div className="flex-shrink-0 pt-3" style={{ borderTop: '1px solid rgba(123,110,196,0.10)' }}>
              <p
                className="text-[8px] font-semibold tracking-[0.14em] uppercase mb-2"
                style={{ color: 'var(--text-muted)', opacity: 0.40 }}
              >
                Your Understanding
              </p>
              <div className="flex gap-1.5">
                {LEARNING_ORDER.map((state) => {
                  const cfg = LEARNING_CONFIG[state];
                  const active = learningState === state;
                  return (
                    <motion.button
                      key={state}
                      onClick={() => setLearningState(node.id, active ? 'unset' : state)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[10px] font-medium"
                      style={{
                        background: active ? cfg.bg : 'rgba(123,110,196,0.04)',
                        border: active ? `1px solid ${cfg.border}` : '1px solid rgba(123,110,196,0.10)',
                        color: active ? cfg.color : 'var(--text-muted)',
                        boxShadow: active ? `0 0 10px ${cfg.color}20` : 'none',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      animate={{ scale: active ? 1.02 : 1 }}
                      transition={{ duration: 0.14 }}
                    >
                      <span
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{
                          background: active ? cfg.color : 'rgba(123,110,196,0.20)',
                          boxShadow: active ? `0 0 4px ${cfg.color}` : 'none',
                        }}
                      />
                      {cfg.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Prev / Next footer — always visible ────────────────────────── */}
          {traversalOrder.length > 1 && (
            <div
              className="flex-shrink-0 flex items-stretch"
              style={{ borderTop: '1px solid rgba(123,110,196,0.10)', background: 'rgba(123,110,196,0.02)' }}
            >
              <button
                onClick={() => prevNode && navigateToNode(prevNode.id)}
                className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left min-w-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <ArrowLeft size={10} className="flex-shrink-0" />
                <span className="text-[10px] truncate">{prevNode?.label}</span>
              </button>

              <div
                className="flex-shrink-0 flex items-center px-3 text-[9px] font-medium tabular-nums"
                style={{ color: 'var(--text-muted)', opacity: 0.35, borderLeft: '1px solid rgba(123,110,196,0.08)', borderRight: '1px solid rgba(123,110,196,0.08)' }}
              >
                {traversalIdx + 1}/{traversalOrder.length}
              </div>

              <button
                onClick={() => nextNode && navigateToNode(nextNode.id)}
                className="flex-1 flex items-center justify-end gap-2 px-4 py-2.5 text-right min-w-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span className="text-[10px] truncate">{nextNode?.label}</span>
                <ArrowRight size={10} className="flex-shrink-0" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
