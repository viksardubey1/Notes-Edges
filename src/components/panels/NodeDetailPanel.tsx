/**
 * NodeDetailPanel — Notes & Edges
 *
 * Editorial knowledge companion. Perplexity × Apple × Cosmos.
 *
 * Design language:
 * - Generous breathing room — 24px gutters, 20-28px section gaps
 * - Cluster color as visual narrative thread throughout
 * - ConceptOrbit mini-visualization in header
 * - Relationship cards (not chips) for connected ideas
 * - Large editorial typography for the concept title
 * - Mastery as an organic state, not a settings grid
 */

'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Network, ArrowRight, Target, Lightbulb,
  Pencil, RotateCcw, Sparkles, ArrowLeft,
  ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react';
import { useGraphStore, getNeighborNodeIds } from '@/store/graph.store';
import { LatexText } from '@/components/ui/latex-text';
import { useUIStore } from '@/store/ui.store';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { useAuth } from '@/context/AuthContext';
import { saveGraph } from '@/lib/graphs';
import type { GraphNode, SemanticEdgeType, LearningState } from '@/types/graph';
import { buildTraversalOrder } from '@/lib/traversal';
import { SEMANTIC_TYPE_CONFIG } from '@/lib/graph/edge-config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Connection {
  edge: { id: string; weight: number; semanticType?: string };
  other: GraphNode | undefined;
  direction: 'in' | 'out';
}

// ── Learning state config ─────────────────────────────────────────────────────

const LEARNING_CONFIG: Record<Exclude<LearningState, 'unset'>, {
  label: string; sublabel: string; color: string; bg: string; border: string; glow: string;
}> = {
  weak:       { label: 'Struggling', sublabel: 'Need help', color: '#E06070', bg: 'rgba(224,96,112,0.10)', border: 'rgba(224,96,112,0.25)', glow: 'rgba(224,96,112,0.25)' },
  reviewing:  { label: 'Reviewing',  sublabel: 'Getting it', color: '#D4A840', bg: 'rgba(212,168,64,0.10)',  border: 'rgba(212,168,64,0.25)',  glow: 'rgba(212,168,64,0.25)' },
  understood: { label: 'Got it',     sublabel: 'Confident',  color: '#60C898', bg: 'rgba(96,200,152,0.10)', border: 'rgba(96,200,152,0.25)',  glow: 'rgba(96,200,152,0.30)' },
  mastered:   { label: 'Mastered',   sublabel: 'It\'s mine', color: '#60C0E8', bg: 'rgba(96,192,232,0.10)',  border: 'rgba(96,192,232,0.25)',  glow: 'rgba(96,192,232,0.35)' },
};

const LEARNING_ORDER: Exclude<LearningState, 'unset'>[] = ['weak', 'reviewing', 'understood', 'mastered'];

// Derived from SEMANTIC_TYPE_CONFIG — the single source of truth in edge-config.ts.
const SEM_TYPE_LABELS: Partial<Record<SemanticEdgeType, string>> = Object.fromEntries(
  Object.entries(SEMANTIC_TYPE_CONFIG).map(([k, v]) => [k, v.verb]),
) as Partial<Record<SemanticEdgeType, string>>;

const SEM_TYPE_COLORS: Partial<Record<SemanticEdgeType, string>> = Object.fromEntries(
  Object.entries(SEMANTIC_TYPE_CONFIG).map(([k, v]) => [k, v.color]),
) as Partial<Record<SemanticEdgeType, string>>;

// ── ConceptOrbit mini-visualization ──────────────────────────────────────────

function ConceptOrbit({ node, connections }: { node: GraphNode; connections: Connection[] }) {
  const size = 88;
  const cx = size / 2, cy = size / 2;
  const centerR = 9;
  const orbitR = 32;
  const visible = connections.slice(0, 7);
  const angleStep = (2 * Math.PI) / Math.max(1, visible.length);
  const color = node.clusterColor ?? '#9876EE';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {/* Outer atmospheric glow */}
      <circle cx={cx} cy={cy} r={centerR + 18} fill={color} opacity={0.06} style={{ filter: 'blur(8px)' }} />
      {/* Orbit ring */}
      <circle cx={cx} cy={cy} r={orbitR} fill="none"
        stroke={color} strokeWidth={0.6} opacity={0.20} strokeDasharray="2.5 3" />
      {/* Connection lines */}
      {visible.map((conn, i) => {
        const a = i * angleStep - Math.PI / 2;
        const tx = cx + Math.cos(a) * orbitR;
        const ty = cy + Math.sin(a) * orbitR;
        return (
          <line key={conn.edge.id} x1={cx} y1={cy} x2={tx} y2={ty}
            stroke={conn.other?.clusterColor ?? color}
            strokeWidth={0.7} opacity={0.30}
          />
        );
      })}
      {/* Satellite nodes */}
      {visible.map((conn, i) => {
        const a = i * angleStep - Math.PI / 2;
        const tx = cx + Math.cos(a) * orbitR;
        const ty = cy + Math.sin(a) * orbitR;
        const c = conn.other?.clusterColor ?? color;
        return (
          <g key={conn.edge.id}>
            <circle cx={tx} cy={ty} r={5.5} fill={c} opacity={0.12} />
            <circle cx={tx} cy={ty} r={3} fill={c} opacity={0.65} />
          </g>
        );
      })}
      {/* Center node — inner fill */}
      <circle cx={cx} cy={cy} r={centerR + 5} fill={color} opacity={0.10} />
      <circle cx={cx} cy={cy} r={centerR} fill={color} opacity={0.28} />
      <circle cx={cx} cy={cy} r={centerR - 3} fill={color} opacity={0.55} />
      {/* Inner highlight */}
      <circle cx={cx - 3} cy={cy - 3} r={3} fill="rgba(255,255,255,0.30)" style={{ filter: 'blur(1px)' }} />
    </svg>
  );
}

// ── Relationship card ──────────────────────────────────────────────────────────

function RelationshipCard({
  conn, onNavigate,
}: {
  conn: Connection;
  onNavigate: () => void;
}) {
  const other = conn.other;
  if (!other) return null;
  const semType = conn.edge.semanticType as SemanticEdgeType | undefined;
  const relLabel = semType ? (SEM_TYPE_LABELS[semType] ?? semType.toLowerCase()) : 'relates to';
  const relColor = semType ? (SEM_TYPE_COLORS[semType] ?? '#6A6A8A') : '#6A6A8A';
  const c = other.clusterColor ?? '#9876EE';

  return (
    <motion.button
      onClick={onNavigate}
      className="flex flex-col gap-2 p-3 rounded-[14px] text-left w-full"
      style={{
        background: `${c}0D`,
        border: `1px solid ${c}28`,
      }}
      whileHover={{ scale: 1.02, background: `${c}18` }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      {/* Cluster dot + label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: c, boxShadow: `0 0 5px ${c}80` }} />
        <span className="text-[12px] font-semibold leading-tight truncate"
          style={{ color: 'var(--text-primary)' }}>
          {other.label}
        </span>
      </div>
      {/* Relationship type */}
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full self-start"
        style={{ background: `${relColor}18`, color: relColor, border: `1px solid ${relColor}30` }}>
        {relLabel}
      </span>
    </motion.button>
  );
}

// ── Inline edit button ─────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-6 h-6 flex items-center justify-center rounded-[6px] transition-all opacity-0 group-hover:opacity-50 hover:!opacity-100"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
      }}
    >
      <Pencil size={9} />
    </button>
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export function NodeDetailPanel() {
  const [deeperExpanded, setDeeperExpanded] = useState(true);
  const [editingField, setEditingField] = useState<'label' | 'summary' | 'why' | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [connectionsExpanded, setConnectionsExpanded] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    graph, selectedNodeId, selectNode, setMode, learningStates, setLearningState,
    navigationHistory, navigateBack, updateNode, clearVisited,
  } = useGraphStore();
  const { closeNodeDetail } = useUIStore();
  const { handleNodeClick, navigateToNode } = useGraphInteractions();
  const { session } = useAuth();

  const node = useMemo(
    () => graph?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  );

  const connectedEdges = useMemo((): Connection[] => {
    if (!graph || !selectedNodeId || !node) return [];
    return graph.edges
      .filter((e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId)
      .map((e) => {
        const otherId = e.sourceId === selectedNodeId ? e.targetId : e.sourceId;
        const other = graph.nodes.find((n) => n.id === otherId);
        return { edge: e, other, direction: (e.sourceId === selectedNodeId ? 'out' : 'in') as 'out' | 'in' };
      })
      .filter((x) => x.other != null)
      .sort((a, b) => b.edge.weight - a.edge.weight);
  }, [graph, selectedNodeId, node]);

  // Stable topological traversal order for the whole graph (recomputes only when graph changes)
  const traversalOrder = useMemo(() => {
    if (!graph) return [];
    return buildTraversalOrder(graph.nodes, graph.edges);
  }, [graph]);

  // Position in the traversal sequence. Falls back to 0 so next/prev are always valid.
  const traversalIdx = useMemo(() => {
    if (traversalOrder.length === 0) return 0;
    const idx = node ? traversalOrder.indexOf(node.id) : -1;
    return idx === -1 ? 0 : idx;
  }, [node, traversalOrder]);

  // Always returns a node as long as the graph has 2+ nodes.
  // Circular: next after last wraps to first, prev before first wraps to last.
  const nextInOrder = useMemo(() => {
    if (!graph || !node || traversalOrder.length < 2) return null;
    const nextIdx = (traversalIdx + 1) % traversalOrder.length;
    return graph.nodes.find((n) => n.id === traversalOrder[nextIdx]) ?? null;
  }, [graph, node, traversalIdx, traversalOrder]);

  const prevInOrder = useMemo(() => {
    if (!graph || !node || traversalOrder.length < 2) return null;
    const prevIdx = (traversalIdx - 1 + traversalOrder.length) % traversalOrder.length;
    return graph.nodes.find((n) => n.id === traversalOrder[prevIdx]) ?? null;
  }, [graph, node, traversalIdx, traversalOrder]);

  const startEdit = (field: 'label' | 'summary' | 'why', currentValue: string) => {
    setDraftValue(currentValue);
    setEditingField(field);
    setTimeout(() => {
      if (field === 'label') editInputRef.current?.focus();
      else editTextareaRef.current?.focus();
    }, 40);
  };

  const commitEdit = () => {
    if (!editingField || !node || !graph) { setEditingField(null); return; }
    const trimmed = draftValue.trim();
    if (!trimmed) { setEditingField(null); return; }
    if (editingField === 'label') updateNode(node.id, { label: trimmed });
    else if (editingField === 'summary') updateNode(node.id, { metadata: { summary: trimmed } });
    else updateNode(node.id, { metadata: { whyItMatters: trimmed } });
    const now = new Date().toISOString();
    const updatedNodes = graph.nodes.map((n) => {
      if (n.id !== node.id) return n;
      if (editingField === 'label') return { ...n, label: trimmed };
      if (editingField === 'summary') return { ...n, metadata: { ...n.metadata, summary: trimmed } };
      return { ...n, metadata: { ...n.metadata, whyItMatters: trimmed } };
    });
    const updatedGraph = { ...graph, nodes: updatedNodes, updatedAt: now };
    if (session) void saveGraph(session.userId, updatedGraph);
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const prevNodeId = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
  const prevNode = prevNodeId ? graph?.nodes.find((n) => n.id === prevNodeId) : null;
  const currentLearning = (learningStates[node?.id ?? ''] ?? 'unset') as LearningState;
  const gaps = Array.isArray(node?.metadata?.gaps) ? node!.metadata.gaps : [];
  const expansions = Array.isArray(node?.metadata?.expansionSuggestions) ? node!.metadata.expansionSuggestions : [];
  const hasDeeper = !!(node?.metadata?.whyItMatters || node?.metadata?.sourceQuote || gaps.length > 0 || expansions.length > 0);
  const accent = node?.clusterColor ?? 'var(--accent-primary)';
  const accentRaw = node?.clusterColor ?? '#9876EE';

  // Visible connection cards (6 primary, rest collapsible)
  const primaryConnections = connectedEdges.slice(0, 6);
  const extraConnections = connectedEdges.slice(6);

  return (
    <div
      className="flex flex-col h-full border-l"
      style={{
        background: 'var(--bg-surface-1)',
        borderColor: 'var(--border-default)',
        transition: 'background 300ms ease, border-color 300ms ease',
      }}
    >

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!node && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5"
          >
            {/* Orbital empty state graphic */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Outer ring */}
              <svg width={96} height={96} viewBox="0 0 96 96" className="absolute inset-0" aria-hidden="true">
                <circle cx={48} cy={48} r={44} fill="none"
                  stroke="rgba(152,118,238,0.12)" strokeWidth={1} strokeDasharray="3 4" />
                <circle cx={48} cy={48} r={32} fill="none"
                  stroke="rgba(152,118,238,0.08)" strokeWidth={0.8} />
                {/* 5 satellite dots */}
                {[0, 72, 144, 216, 288].map((deg, i) => {
                  const a = (deg - 90) * Math.PI / 180;
                  return (
                    <circle key={i}
                      cx={48 + Math.cos(a) * 32} cy={48 + Math.sin(a) * 32}
                      r={2.5} fill="rgba(152,118,238,0.35)" />
                  );
                })}
              </svg>
              {/* Center icon */}
              <div className="relative w-14 h-14 rounded-[18px] flex items-center justify-center ambient-float"
                style={{
                  background: 'rgba(152,118,238,0.08)',
                  border: '1px solid rgba(152,118,238,0.22)',
                  boxShadow: '0 0 32px rgba(152,118,238,0.12)',
                }}>
                <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[17px] font-light tracking-tight leading-snug"
                style={{ color: 'var(--text-primary)' }}>
                Your cosmos awaits
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Click any concept to reveal its connections, context, and your path forward.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panel content ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {node && (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex-1 overflow-y-auto flex flex-col min-h-0"
          >

            {/* ── Cluster color accent strip ─────────────────────────────── */}
            <div className="h-[3px] flex-shrink-0 w-full"
              style={{ background: `linear-gradient(90deg, ${accentRaw} 0%, ${accentRaw}00 100%)` }}
            />

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-5 flex-shrink-0">
              {/* Back nav + close row */}
              <div className="flex items-center justify-between mb-4">
                {prevNode ? (
                  <button
                    onClick={navigateBack}
                    className="flex items-center gap-1.5 text-[11px] font-medium transition-all rounded-[7px] px-2 py-1 -ml-2"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-glow)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <ArrowLeft size={11} />
                    <span className="truncate max-w-[130px]">{prevNode.label}</span>
                  </button>
                ) : <div />}
                <button
                  onClick={() => { selectNode(null); closeNodeDetail(); }}
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] transition-all"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Concept title + orbital mini-viz */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Cluster badge */}
                  {node.clusterName && (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase"
                        style={{ color: accentRaw, opacity: 0.75 }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentRaw }} />
                        {node.clusterName}
                      </span>
                    </div>
                  )}

                  {/* Concept name — editorial, large */}
                  <div className="group flex items-start gap-2 mb-1">
                    {editingField === 'label' ? (
                      <input
                        ref={editInputRef}
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        onBlur={commitEdit}
                        className="flex-1 bg-transparent font-light text-[24px] leading-tight outline-none border-b pb-0.5"
                        style={{ color: 'var(--text-primary)', borderColor: accentRaw, caretColor: accentRaw }}
                      />
                    ) : (
                      <>
                        <h2 className="font-light text-[24px] leading-tight tracking-tight flex-1"
                          style={{ color: 'var(--text-primary)' }}>
                          {node.label}
                        </h2>
                        <div className="mt-1.5 flex-shrink-0">
                          <EditBtn onClick={() => startEdit('label', node.label)} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {connectedEdges.length} connection{connectedEdges.length !== 1 ? 's' : ''}
                    </span>
                    {node.metadata?.depthLevel && node.metadata.depthLevel !== 'surface' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${accentRaw}14`, color: accentRaw, border: `1px solid ${accentRaw}28` }}>
                        {node.metadata.depthLevel === 'mastered' ? 'Deep' : node.metadata.depthLevel === 'explained' ? 'Explained' : 'Surface'}
                      </span>
                    )}
                    {node.centrality > 0 && (() => {
                      const allNodes = graph?.nodes ?? [];
                      const rank = allNodes.filter(n => n.centrality > node.centrality).length + 1;
                      const pct = Math.round((1 - (rank - 1) / Math.max(allNodes.length - 1, 1)) * 100);
                      return pct >= 70 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(212,168,64,0.12)', color: '#D4A840', border: '1px solid rgba(212,168,64,0.22)' }}>
                          Core concept
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Inline learning state — compact row */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {LEARNING_ORDER.map((state) => {
                      const cfg = LEARNING_CONFIG[state];
                      const active = currentLearning === state;
                      return (
                        <button
                          key={state}
                          onClick={() => setLearningState(node.id, active ? 'unset' : state)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[10px] font-medium transition-all"
                          style={{
                            background: active ? cfg.bg : 'var(--bg-surface-2)',
                            border: active ? `1px solid ${cfg.border}` : '1px solid transparent',
                            color: active ? cfg.color : 'var(--text-muted)',
                            boxShadow: active ? `0 0 10px ${cfg.glow}` : 'none',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full"
                            style={{ background: active ? cfg.color : 'var(--text-muted)', opacity: active ? 1 : 0.35 }} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ConceptOrbit mini-visualization */}
                {connectedEdges.length > 0 && (
                  <div className="flex-shrink-0 -mt-1">
                    <ConceptOrbit node={node} connections={connectedEdges} />
                  </div>
                )}
              </div>

              {/* ── Source quote — pulled up for immediate context ──────── */}
              {node.metadata?.sourceQuote && (
                <blockquote
                  className="mx-6 mt-1 mb-4 px-4 py-3 rounded-[14px] text-[12px] leading-[1.75] italic"
                  style={{
                    background: 'var(--bg-surface-2)',
                    borderLeft: `2px solid ${accentRaw}40`,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <LatexText>{node.metadata.sourceQuote}</LatexText>
                </blockquote>
              )}
            </div>

            {/* ── AI Summary ────────────────────────────────────────────── */}
            <div className="mx-6 mb-6 flex-shrink-0">
              <div
                className="px-4 py-4 rounded-[16px] group"
                style={{
                  background: `${accentRaw}0A`,
                  borderLeft: `2px solid ${accentRaw}50`,
                  border: `1px solid ${accentRaw}18`,
                  borderLeftWidth: '2px',
                  borderLeftColor: `${accentRaw}60`,
                }}
              >
                {editingField === 'summary' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      ref={editTextareaRef}
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter' && e.metaKey) commitEdit(); }}
                      rows={4}
                      className="w-full bg-transparent text-[13px] leading-[1.75] resize-none outline-none"
                      style={{ color: 'var(--text-secondary)', caretColor: accentRaw }}
                      placeholder="Describe this concept…"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={cancelEdit} className="px-3 py-1 rounded-[7px] text-[11px] font-medium"
                        style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                        Cancel
                      </button>
                      <button onClick={commitEdit} className="px-3 py-1 rounded-[7px] text-[11px] font-semibold text-white"
                        style={{ background: accentRaw }}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] leading-[1.80]" style={{ color: 'var(--text-secondary)' }}>
                      <LatexText>
                        {node.metadata?.summary ?? `${node.label} is connected to ${connectedEdges.length} other ideas in your knowledge universe.`}
                      </LatexText>
                    </p>
                    <button
                      onClick={() => startEdit('summary', node.metadata?.summary ?? '')}
                      className="mt-2 text-[10px] opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity"
                      style={{ color: accentRaw }}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Next in Sequence — always shown when graph has >1 node ── */}
            {nextInOrder && (
              <div className="px-6 mb-6 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-semibold tracking-[0.14em] uppercase flex items-center gap-1.5"
                    style={{ color: accentRaw, opacity: 0.9 }}>
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'flex' }}
                    >
                      <ArrowRight size={9} />
                    </motion.span>
                    Next Up
                  </p>
                  {traversalOrder.length > 1 && (
                    <span className="text-[9px] font-medium tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                      {traversalIdx + 1} / {traversalOrder.length}
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 0 0px ${(nextInOrder.clusterColor ?? accentRaw)}00`,
                      `0 0 0 4px ${(nextInOrder.clusterColor ?? accentRaw)}22`,
                      `0 0 0 0px ${(nextInOrder.clusterColor ?? accentRaw)}00`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-[18px]"
                >
                <motion.button
                  onClick={() => navigateToNode(nextInOrder.id)}
                  className="w-full rounded-[18px] overflow-hidden text-left"
                  style={{
                    background: `linear-gradient(145deg, ${(nextInOrder.clusterColor ?? accentRaw)}18 0%, ${(nextInOrder.clusterColor ?? accentRaw)}08 60%, rgba(152,118,238,0.06) 100%)`,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                  animate={{
                    borderColor: [
                      `${(nextInOrder.clusterColor ?? accentRaw)}40`,
                      `${(nextInOrder.clusterColor ?? accentRaw)}90`,
                      `${(nextInOrder.clusterColor ?? accentRaw)}40`,
                    ],
                    boxShadow: [
                      `0 4px 24px ${(nextInOrder.clusterColor ?? accentRaw)}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
                      `0 4px 32px ${(nextInOrder.clusterColor ?? accentRaw)}40, inset 0 1px 0 rgba(255,255,255,0.04)`,
                      `0 4px 24px ${(nextInOrder.clusterColor ?? accentRaw)}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const semType = connectedEdges.find((c) => c.other?.id === nextInOrder.id)?.edge.semanticType as SemanticEdgeType | undefined;
                          return semType ? (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: `${SEM_TYPE_COLORS[semType] ?? '#9876EE'}18`,
                                  color: SEM_TYPE_COLORS[semType] ?? 'var(--accent-primary)',
                                  border: `1px solid ${SEM_TYPE_COLORS[semType] ?? '#9876EE'}30`,
                                }}>
                                {SEM_TYPE_LABELS[semType] ?? semType}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        {traversalIdx === traversalOrder.length - 1 && traversalOrder.length > 1 && (
                          <p className="text-[9px] font-medium mb-1.5" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>loops back</p>
                        )}
                        <p className="text-[15px] font-semibold leading-tight tracking-tight"
                          style={{ color: 'var(--text-primary)' }}>
                          {nextInOrder.label}
                        </p>
                        {nextInOrder.metadata?.summary && (
                          <p className="text-[11px] leading-relaxed line-clamp-2 mt-1.5"
                            style={{ color: 'var(--text-muted)' }}>
                            {nextInOrder.metadata.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-0.5">
                        <div className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ background: nextInOrder.clusterColor ?? accentRaw, boxShadow: `0 0 14px ${(nextInOrder.clusterColor ?? accentRaw)}90` }} />
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight size={14} style={{ color: nextInOrder.clusterColor ?? accentRaw, opacity: 0.9 }} />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  <div className="h-[1.5px]"
                    style={{ background: `linear-gradient(90deg, ${(nextInOrder.clusterColor ?? accentRaw)}70 0%, ${(nextInOrder.clusterColor ?? accentRaw)}00 100%)` }} />
                </motion.button>
                </motion.div>
              </div>
            )}

            {/* ── Connection Threads — relationship cards ────────────────── */}
            {connectedEdges.length > 0 && (
              <div className="px-6 mb-6 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                    {connectedEdges.length} Connection{connectedEdges.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* 3-column relationship cards */}
                <div className="grid grid-cols-3 gap-2">
                  {primaryConnections.map(({ edge, other, direction }) => (
                    other && (
                      <RelationshipCard
                        key={edge.id}
                        conn={{ edge, other, direction }}
                        onNavigate={() => navigateToNode(other.id)}
                      />
                    )
                  ))}
                </div>

                {/* Expandable extra connections */}
                {extraConnections.length > 0 && (
                  <div className="mt-2">
                    <AnimatePresence initial={false}>
                      {connectionsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {extraConnections.map(({ edge, other, direction }) => (
                              other && (
                                <RelationshipCard
                                  key={edge.id}
                                  conn={{ edge, other, direction }}
                                  onNavigate={() => navigateToNode(other.id)}
                                />
                              )
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={() => setConnectionsExpanded((v) => !v)}
                      className="flex items-center gap-1.5 text-[10px] font-medium transition-opacity hover:opacity-80 mt-1"
                      style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                    >
                      {connectionsExpanded
                        ? <><ChevronUp size={10} /> Show less</>
                        : <><ChevronDown size={10} /> +{extraConnections.length} more</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Deeper Context ─────────────────────────────────────────── */}
            {hasDeeper && (
              <div className="px-6 mb-6 flex-shrink-0">
                <button
                  onClick={() => setDeeperExpanded((v) => !v)}
                  className="w-full flex items-center justify-between mb-3 transition-opacity hover:opacity-80"
                >
                  <p className="text-[9px] font-semibold tracking-[0.14em] uppercase flex items-center gap-1.5"
                    style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                    <BookOpen size={9} />
                    Deeper Context
                  </p>
                  {deeperExpanded
                    ? <ChevronUp size={11} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    : <ChevronDown size={11} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  }
                </button>

                <AnimatePresence initial={false}>
                  {deeperExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4">

                        {/* Why it matters — pullquote style */}
                        {node.metadata?.whyItMatters && editingField !== 'why' && (
                          <div
                            className="group px-4 py-4 rounded-[14px] relative overflow-hidden"
                            style={{ background: `${accentRaw}08`, borderLeft: `2px solid ${accentRaw}50` }}
                          >
                            {/* Decorative quotation mark */}
                            <span className="absolute top-2 right-3 text-[40px] font-serif leading-none select-none pointer-events-none"
                              style={{ color: accentRaw, opacity: 0.08 }}>
                              "
                            </span>
                            <p className="text-[9px] font-semibold tracking-[0.10em] uppercase mb-2"
                              style={{ color: accentRaw, opacity: 0.60 }}>
                              Why it matters
                            </p>
                            <p className="text-[12px] leading-[1.75] relative z-10"
                              style={{ color: 'var(--text-secondary)' }}>
                              <LatexText>{node.metadata.whyItMatters}</LatexText>
                            </p>
                            <button onClick={() => startEdit('why', node.metadata!.whyItMatters!)}
                              className="mt-2 text-[9px] opacity-0 group-hover:opacity-40 transition-opacity"
                              style={{ color: accentRaw }}>
                              Edit
                            </button>
                          </div>
                        )}

                        {editingField === 'why' && (
                          <div className="flex flex-col gap-2">
                            <textarea
                              ref={editTextareaRef}
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter' && e.metaKey) commitEdit(); }}
                              rows={3}
                              className="w-full px-3 py-2.5 rounded-[12px] text-[13px] leading-relaxed resize-none outline-none"
                              style={{ background: 'var(--bg-surface-2)', border: `1px solid ${accentRaw}40`, color: 'var(--text-primary)', caretColor: accentRaw }}
                              placeholder="Why does this matter…"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={cancelEdit} className="px-3 py-1 rounded-[7px] text-[11px] font-medium"
                                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                                Cancel
                              </button>
                              <button onClick={commitEdit} className="px-3 py-1 rounded-[7px] text-[11px] font-semibold text-white"
                                style={{ background: accentRaw }}>
                                Save
                              </button>
                            </div>
                          </div>
                        )}

                        {!node.metadata?.whyItMatters && editingField !== 'why' && (
                          <button onClick={() => startEdit('why', '')}
                            className="text-[11px] opacity-35 hover:opacity-70 transition-opacity text-left"
                            style={{ color: accentRaw }}>
                            + Add why it matters
                          </button>
                        )}

                        {/* Knowledge gaps */}
                        {gaps.length > 0 && (
                          <div>
                            <p className="text-[9px] font-semibold tracking-[0.10em] uppercase mb-2.5 flex items-center gap-1.5"
                              style={{ color: '#D4A840', opacity: 0.65 }}>
                              <Target size={9} />
                              Next breakthroughs
                            </p>
                            <div className="flex flex-col gap-2">
                              {gaps.slice(0, 3).map((gap, i) => (
                                <div key={i}
                                  className="flex gap-2.5 px-3.5 py-2.5 rounded-[12px] text-[11px] leading-relaxed"
                                  style={{ background: 'rgba(212,168,64,0.06)', border: '1px solid rgba(212,168,64,0.14)', color: 'var(--text-secondary)' }}>
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5"
                                    style={{ background: 'rgba(212,168,64,0.18)', color: '#D4A840' }}>
                                    {i + 1}
                                  </span>
                                  <LatexText>{gap}</LatexText>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expansion ideas */}
                        {expansions.length > 0 && (
                          <div>
                            <p className="text-[9px] font-semibold tracking-[0.10em] uppercase mb-2 flex items-center gap-1.5"
                              style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                              <Lightbulb size={9} />
                              Explore further
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {expansions.slice(0, 5).map((s, i) => (
                                <span key={i}
                                  className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                                  + {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="px-6 pb-8 mt-auto flex-shrink-0 flex flex-col gap-2.5">
              {/* Primary CTA */}
              <motion.button
                onClick={() => setMode('neighborhood')}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-[16px] text-[13px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accentRaw}CC 0%, ${accentRaw}99 100%)`,
                  boxShadow: `0 4px 20px ${accentRaw}30`,
                }}
                whileHover={{ scale: 1.01, boxShadow: `0 6px 28px ${accentRaw}45` }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.14 }}
              >
                <div className="flex items-center gap-2.5">
                  <Network size={14} />
                  Explore constellation
                </div>
                <ArrowRight size={14} style={{ opacity: 0.75 }} />
              </motion.button>

              {/* Secondary reset */}
              <button
                onClick={clearVisited}
                className="flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 transition-opacity"
                style={{ color: 'var(--text-muted)', opacity: 0.35 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.70'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.35'; }}
              >
                <RotateCcw size={9} />
                Reset exploration
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prev / Next — always visible, outside scroll area ─────────────── */}
      {node && traversalOrder.length > 1 && (
        <div
          className="flex-shrink-0 flex items-stretch"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-2)',
          }}
        >
          <button
            onClick={() => navigateToNode(traversalOrder[(traversalIdx - 1 + traversalOrder.length) % traversalOrder.length])}
            className="flex-1 flex items-center gap-2 px-4 py-3 text-left transition-colors min-w-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={11} className="flex-shrink-0" />
            <span className="text-[11px] truncate">{prevInOrder?.label}</span>
          </button>

          <div
            className="flex-shrink-0 flex items-center px-3 text-[10px] font-medium tabular-nums"
            style={{ color: 'var(--text-muted)', opacity: 0.5, borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}
          >
            {traversalIdx + 1}/{traversalOrder.length}
          </div>

          <button
            onClick={() => navigateToNode(traversalOrder[(traversalIdx + 1) % traversalOrder.length])}
            className="flex-1 flex items-center justify-end gap-2 px-4 py-3 text-right transition-colors min-w-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <span className="text-[11px] truncate">{nextInOrder?.label}</span>
            <ArrowRight size={11} className="flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
