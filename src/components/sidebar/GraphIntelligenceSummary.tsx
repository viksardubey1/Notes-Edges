/**
 * GraphIntelligenceSummary — Notes & Edges
 *
 * "Your Journey" panel — exploration-focused, momentum-building language.
 * Sections: progress · begin here · areas of strength · next breakthroughs · AI nudge
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Sparkles, TrendingUp, Zap, ArrowRight,
  Telescope, Navigation,
} from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

export function GraphIntelligenceSummary() {
  const {
    graph, selectNode,
    progressiveMode, revealedNodeIds, showFullGraph, resetProgressiveMode,
  } = useGraphStore();
  const [expanded, setExpanded] = useState(true);
  const [nextOpen, setNextOpen] = useState(false);
  const summary = graph?.intelligenceSummary;

  if (!summary) return null;

  const mainConceptNode = summary.mainConcept
    ? graph?.nodes.find((n) => n.id === summary.mainConcept)
    : null;

  const strongAreas = Array.isArray(summary.strongAreas) ? summary.strongAreas : [];
  const worthExploring = Array.isArray(summary.weakAreas) ? summary.weakAreas : [];

  const totalNodes = graph?.nodeCount ?? 1;
  const revealedCount = revealedNodeIds?.size ?? totalNodes;
  const rawScore = Math.round((strongAreas.length / Math.max(1, totalNodes)) * 100 + 28);
  const clampedScore = Math.min(rawScore, 91);

  return (
    <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[5px] flex items-center justify-center"
            style={{ background: 'var(--accent-glow)' }}>
            <Navigation size={11} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Your Journey
          </span>
        </div>
        {expanded
          ? <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3">

              {/* Progress card */}
              <div className="px-3 py-3 rounded-[10px]" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Ideas explored
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                    {clampedScore}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedScore}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                    style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-bright))' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    {totalNodes} concepts · {graph?.edgeCount} connections
                  </span>
                  {strongAreas.length > 0 && (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {strongAreas.length} strengths found
                    </span>
                  )}
                </div>
              </div>

              {/* Exploration mode toggle */}
              {graph && graph.nodes.length > 8 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-[8px]"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: progressiveMode ? 'var(--accent-primary)' : 'var(--border-default)' }} />
                  <span className="text-[10px] flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {progressiveMode
                      ? `Discovering · ${revealedCount} of ${totalNodes} revealed`
                      : 'Full universe visible'}
                  </span>
                  <button
                    onClick={progressiveMode ? showFullGraph : resetProgressiveMode}
                    className="text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: 'var(--bg-surface-3)', color: 'var(--accent-primary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-bright)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
                  >
                    {progressiveMode ? 'Reveal all' : 'Guide me'}
                  </button>
                </div>
              )}

              {/* Begin here */}
              {mainConceptNode && (
                <button
                  onClick={() => selectNode(mainConceptNode.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left transition-all"
                  style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-glow)'; }}
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
                      Begin here
                    </p>
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {mainConceptNode.label}
                    </p>
                  </div>
                  <ArrowRight size={12} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
                </button>
              )}

              {/* Areas of strength */}
              {strongAreas.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={10} color="#50D0A0" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#50D0A0' }}>
                      Areas of strength
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {strongAreas.slice(0, 4).map((area) => (
                      <span key={area}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: '#50D0A018', color: '#50D0A0', border: '1px solid #50D0A028' }}>
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Next breakthroughs */}
              {worthExploring.length > 0 && (
                <div>
                  <button
                    onClick={() => setNextOpen((v) => !v)}
                    className="w-full flex items-center justify-between mb-1.5 transition-opacity hover:opacity-75"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap size={10} color="#E87090" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#E87090' }}>
                        Next breakthroughs · {worthExploring.length}
                      </span>
                    </div>
                    {nextOpen ? <ChevronUp size={10} color="#E87090" /> : <ChevronDown size={10} color="#E87090" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {nextOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1.5">
                          {worthExploring.slice(0, 4).map((area, i) => (
                            <div key={i}
                              className="flex items-start gap-2 px-2.5 py-2 rounded-[8px]"
                              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5"
                                style={{ background: '#E8709022', color: '#E87090' }}>
                                {i + 1}
                              </span>
                              <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{area}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* AI nudge */}
              {summary.suggestion && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-[10px]"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <Telescope size={11} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {summary.suggestion}
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
