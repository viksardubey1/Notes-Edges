/**
 * EdgeDetailPanel — Notes & Edges (v2)
 *
 * Relationship inspector. Perplexity × Apple × Cosmos.
 *
 * Design language:
 * - ConnectionBridge: animated SVG mini-visualization of the two concepts
 * - Relationship type as the visual hero — colour + typography + badge
 * - Editorial insight pullquote for depth
 * - Gradient navigation CTAs matching each node's cluster colour
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, GitBranch, Link2, X, ArrowUpRight } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useUIStore } from '@/store/ui.store';
import type { GraphNode, SemanticEdgeType } from '@/types/graph';

// ── Semantic type config ──────────────────────────────────────────────────────

const SEM_TYPE_CONFIG: Record<SemanticEdgeType, {
  label: string; verb: string; color: string; bg: string; border: string;
  description: string; insight: string;
}> = {
  ENABLES:    {
    label: 'Enables',      verb: 'enables',         color: '#4CAF8A', bg: '#4CAF8A10', border: '#4CAF8A28',
    description: 'Understanding A makes it possible to understand B.',
    insight:     'This is a gateway relationship. Once A clicks, B opens up naturally.',
  },
  IS_A:       {
    label: 'Is a type of', verb: 'is a type of',    color: '#9090BB', bg: '#9090BB10', border: '#9090BB28',
    description: 'A is a specific example or subtype of B.',
    insight:     'Look at B first — it\'s the broader category. Then A is one instance of that pattern.',
  },
  CAUSES:     {
    label: 'Causes',       verb: 'causes',           color: '#E07B50', bg: '#E07B5010', border: '#E07B5028',
    description: 'A directly produces or triggers B.',
    insight:     'Trace the mechanism. When you see A in a problem, ask what it will produce downstream.',
  },
  CONTRASTS:  {
    label: 'Contrasts',    verb: 'contrasts with',   color: '#9B72CC', bg: '#9B72CC10', border: '#9B72CC28',
    description: 'A and B are in tension — understanding the difference is key.',
    insight:     'Test yourself: in what specific situation would you choose one over the other?',
  },
  PART_OF:    {
    label: 'Part of',      verb: 'is part of',       color: '#8888AA', bg: '#8888AA10', border: '#8888AA28',
    description: 'A is a component or sub-concept within B.',
    insight:     'Find the whole before studying the part. B gives A its purpose and context.',
  },
  DEPENDS_ON: {
    label: 'Depends on',   verb: 'depends on',       color: '#C4973A', bg: '#C4973A10', border: '#C4973A28',
    description: 'You need to understand B before A makes full sense.',
    insight:     'This is a prerequisite. If A isn\'t landing, revisit B — the foundation may be shaky.',
  },
  LEADS_TO:   {
    label: 'Leads to',     verb: 'leads to',         color: '#6B9FFF', bg: '#6B9FFF10', border: '#6B9FFF28',
    description: 'A comes first in a sequence — B follows naturally.',
    insight:     'Trace the full chain. Where does the path go after B?',
  },
  RELATES_TO: {
    label: 'Relates to',   verb: 'relates to',       color: '#6A7A9A', bg: '#6A7A9A10', border: '#6A7A9A28',
    description: 'A and B share context or often appear together.',
    insight:     'Look for the hidden pattern. Why do these two ideas keep showing up together?',
  },
};

// ── ConnectionBridge ──────────────────────────────────────────────────────────

interface BridgeProps { sourceNode: GraphNode; targetNode: GraphNode; relColor: string; }

function ConnectionBridge({ sourceNode, targetNode, relColor }: BridgeProps) {
  const W = 224, H = 76;
  const lx = 30, rx = W - 30, cy = H / 2;
  const srcColor = sourceNode.clusterColor ?? relColor;
  const tgtColor = targetNode.clusterColor ?? relColor;

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="edp-src" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#ffffff"  stopOpacity={0.22} />
          <stop offset="100%" stopColor={srcColor} stopOpacity={0.65} />
        </radialGradient>
        <radialGradient id="edp-tgt" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#ffffff"  stopOpacity={0.22} />
          <stop offset="100%" stopColor={tgtColor} stopOpacity={0.65} />
        </radialGradient>
        <linearGradient id="edp-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={srcColor} stopOpacity={0.75} />
          <stop offset="48%"  stopColor={relColor} stopOpacity={1.00} />
          <stop offset="100%" stopColor={tgtColor} stopOpacity={0.75} />
        </linearGradient>
        <filter id="edp-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Ambient halos */}
      <circle cx={lx} cy={cy} r={30} fill={srcColor} opacity={0.12} filter="url(#edp-glow)" />
      <circle cx={rx} cy={cy} r={30} fill={tgtColor} opacity={0.12} filter="url(#edp-glow)" />

      {/* Connection path */}
      <path
        d={`M ${lx + 16} ${cy} C ${W * 0.37} ${cy - 10} ${W * 0.63} ${cy - 10} ${rx - 16} ${cy}`}
        stroke="url(#edp-line)" strokeWidth={1.8} fill="none" opacity={0.75}
      />

      {/* Flowing particle — bounces along the connection */}
      <motion.circle
        cx={lx + 16} cy={cy} r={2.4}
        fill={relColor} opacity={0.92}
        animate={{ x: [0, rx - 16 - (lx + 16), 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Source orb */}
      <circle cx={lx} cy={cy} r={15} fill="url(#edp-src)" stroke={srcColor} strokeWidth={1} strokeOpacity={0.55} />
      <circle cx={lx - 4} cy={cy - 4} r={4.5} fill="white" opacity={0.13} />

      {/* Target orb */}
      <circle cx={rx} cy={cy} r={15} fill="url(#edp-tgt)" stroke={tgtColor} strokeWidth={1} strokeOpacity={0.55} />
      <circle cx={rx - 4} cy={cy - 4} r={4.5} fill="white" opacity={0.13} />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EdgeDetailPanel() {
  const { graph, selectedEdgeId, selectEdge, selectNode } = useGraphStore();
  const { closeNodeDetail } = useUIStore();

  const edge = useMemo(
    () => graph?.edges.find((e) => e.id === selectedEdgeId) ?? null,
    [graph, selectedEdgeId],
  );

  const sourceNode = useMemo(
    () => graph?.nodes.find((n) => n.id === edge?.sourceId) ?? null,
    [graph, edge],
  );

  const targetNode = useMemo(
    () => graph?.nodes.find((n) => n.id === edge?.targetId) ?? null,
    [graph, edge],
  );

  const semType = edge?.semanticType as SemanticEdgeType | undefined;
  const semCfg  = semType ? SEM_TYPE_CONFIG[semType] : null;
  const relColor = semCfg?.color ?? '#8888AA';

  const handleClose       = () => { selectEdge(null); closeNodeDetail(); };
  const handleGoToSource  = () => { if (sourceNode) selectNode(sourceNode.id); };
  const handleGoToTarget  = () => { if (targetNode) selectNode(targetNode.id); };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!edge || !sourceNode || !targetNode) {
    return (
      <div
        className="flex flex-col h-full border-l"
        style={{
          background: 'rgba(12, 8, 26, 0.92)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            {/* Orbital empty state */}
            <div className="relative w-16 h-16 mx-auto mb-4">
              <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
                <circle cx="32" cy="32" r="24" fill="none"
                  stroke="rgba(152,118,238,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="32" cy="32" r="14" fill="none"
                  stroke="rgba(152,118,238,0.08)" strokeWidth="1" />
              </svg>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'rgba(152,118,238,0.45)' }} />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link2 size={16} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
              </div>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Click any connection<br />to explore the relationship.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Panel ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full border-l"
      style={{
        background: 'rgba(12, 8, 26, 0.92)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Relationship colour accent strip */}
      <div
        className="h-[3px] flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${relColor}CC 0%, ${relColor}00 100%)` }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-[5px] flex items-center justify-center"
            style={{ background: `${relColor}22` }}
          >
            <GitBranch size={11} color={relColor} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Relationship
          </span>
        </div>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <motion.div
        key={edge.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >

        {/* ── ConnectionBridge visualization ─────────────────────────────── */}
        <div className="px-4 pt-6 pb-2">
          <ConnectionBridge
            sourceNode={sourceNode}
            targetNode={targetNode}
            relColor={relColor}
          />
        </div>

        {/* ── Relationship type hero ──────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-5 text-center border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {semCfg && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.07em]"
              style={{ background: semCfg.bg, color: semCfg.color, border: `1px solid ${semCfg.border}` }}
            >
              {semCfg.label}
            </span>
          )}

          <div className="mt-3 flex items-center gap-2 justify-center">
            <button
              onClick={handleGoToSource}
              className="text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: sourceNode.clusterColor ?? 'var(--text-primary)' }}
            >
              {sourceNode.label}
            </button>
            <ArrowRight size={13} style={{ color: relColor, opacity: 0.7, flexShrink: 0 }} />
            <button
              onClick={handleGoToTarget}
              className="text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: targetNode.clusterColor ?? 'var(--text-primary)' }}
            >
              {targetNode.label}
            </button>
          </div>

          {semCfg && (
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {semCfg.description}
            </p>
          )}
        </div>

        {/* ── AI explanation ──────────────────────────────────────────────── */}
        <section className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={11} color="#C4973A" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em]" style={{ color: '#C4973A' }}>
              Why this connection matters
            </span>
          </div>
          <div
            className="px-4 py-3 rounded-[12px]"
            style={{
              background: 'rgba(28, 22, 56, 0.60)',
              border: `1px solid ${relColor}28`,
              borderLeft: `2px solid ${relColor}80`,
            }}
          >
            <p className="text-[13px] leading-[1.65] font-light" style={{ color: 'var(--text-primary)' }}>
              {edge.explanation ??
                `${sourceNode.label} and ${targetNode.label} are directly connected in your knowledge map.`}
            </p>
          </div>
        </section>

        {/* ── Insight pullquote ───────────────────────────────────────────── */}
        {semCfg && (
          <section className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="relative pl-4">
              <span
                className="absolute -left-0.5 top-0 text-[32px] leading-none font-serif select-none"
                style={{ color: relColor, opacity: 0.5 }}
              >
                "
              </span>
              <p className="text-[12px] leading-[1.7] italic pt-3" style={{ color: 'var(--text-secondary)' }}>
                {semCfg.insight}
              </p>
            </div>
          </section>
        )}

        {/* ── Connection strength ─────────────────────────────────────────── */}
        <section className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.07em] font-medium" style={{ color: 'var(--text-muted)' }}>
              Connection strength
            </p>
            <span className="text-[11px] tabular-nums font-semibold" style={{ color: relColor }}>
              {Math.round(edge.weight * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${edge.weight * 100}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: `linear-gradient(90deg, ${relColor}88, ${relColor})` }}
            />
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {edge.weight >= 0.8
              ? 'Core relationship — central to understanding this topic'
              : edge.weight >= 0.5
                ? 'Strong connection — worth exploring in depth'
                : 'Supporting connection — provides helpful context'}
          </p>
        </section>

        {/* ── Navigate to either node ─────────────────────────────────────── */}
        <section className="px-5 pt-5 pb-6">
          <p className="text-[10px] uppercase tracking-[0.07em] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
            Explore either concept
          </p>
          <div className="flex flex-col gap-2">
            <motion.button
              onClick={handleGoToSource}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] text-left transition-all"
              style={{
                background: sourceNode.clusterColor ? `${sourceNode.clusterColor}16` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sourceNode.clusterColor ? sourceNode.clusterColor + '35' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: sourceNode.clusterColor ?? relColor }}
                />
                <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {sourceNode.label}
                </span>
              </div>
              <ArrowUpRight size={13} style={{ color: sourceNode.clusterColor ?? 'var(--text-muted)', flexShrink: 0 }} />
            </motion.button>

            <motion.button
              onClick={handleGoToTarget}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] text-left transition-all"
              style={{
                background: targetNode.clusterColor ? `${targetNode.clusterColor}16` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${targetNode.clusterColor ? targetNode.clusterColor + '35' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: targetNode.clusterColor ?? relColor }}
                />
                <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {targetNode.label}
                </span>
              </div>
              <ArrowUpRight size={13} style={{ color: targetNode.clusterColor ?? 'var(--text-muted)', flexShrink: 0 }} />
            </motion.button>
          </div>
        </section>

      </motion.div>
    </div>
  );
}
