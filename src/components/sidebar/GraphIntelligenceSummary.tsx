/**
 * GraphIntelligenceSummary — Notes & Edges
 *
 * Minimal graph context strip. Begin-here shortcut + collapsed insight pills.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Zap, Telescope, ChevronDown } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

export function GraphIntelligenceSummary() {
  const { graph, selectNode } = useGraphStore();
  const [insightsOpen, setInsightsOpen] = useState(false);
  const summary = graph?.intelligenceSummary;

  if (!summary) return null;

  const mainConceptNode = summary.mainConcept
    ? graph?.nodes.find((n) => n.id === summary.mainConcept)
    : null;

  const strongAreas = Array.isArray(summary.strongAreas) ? summary.strongAreas : [];
  const worthExploring = Array.isArray(summary.weakAreas) ? summary.weakAreas : [];
  const nodeCount = graph?.nodeCount ?? 0;
  const edgeCount = graph?.edgeCount ?? 0;

  return (
    <div className="flex flex-col gap-0.5 py-2">

      {/* Begin here — compact row */}
      {mainConceptNode && (
        <button
          onClick={() => selectNode(mainConceptNode.id)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-left transition-colors"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} className="flex-shrink-0" />
          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {mainConceptNode.label}
          </span>
          <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>start</span>
        </button>
      )}

      {/* Graph stats */}
      <div className="flex items-center gap-1.5 px-2.5 py-1">
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {nodeCount} concepts
        </span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {edgeCount} connections
        </span>
      </div>

      {/* Insights toggle */}
      {(strongAreas.length > 0 || worthExploring.length > 0 || summary.suggestion) && (
        <>
          <button
            onClick={() => setInsightsOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] transition-colors"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <Telescope size={11} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Insights</span>
            <motion.div
              animate={{ rotate: insightsOpen ? 180 : 0 }}
              transition={{ duration: 0.15 }}
              className="ml-auto"
            >
              <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 px-2.5 pt-1 pb-2">

                  {/* Strengths */}
                  {strongAreas.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={10} color="#50D0A0" />
                        <span className="text-[10px] font-medium" style={{ color: '#50D0A0' }}>Strengths</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {strongAreas.slice(0, 3).map((area) => (
                          <span key={area}
                            className="px-1.5 py-0.5 rounded-full text-[10px]"
                            style={{ background: '#50D0A014', color: '#50D0A0' }}>
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {worthExploring.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Zap size={10} color="#E87090" />
                        <span className="text-[10px] font-medium" style={{ color: '#E87090' }}>To explore</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {worthExploring.slice(0, 3).map((area, i) => (
                          <span key={i} className="text-[11px] leading-snug line-clamp-1"
                            style={{ color: 'var(--text-muted)' }}>
                            · {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI nudge */}
                  {summary.suggestion && (
                    <p className="text-[11px] leading-snug line-clamp-2 pt-0.5"
                      style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                      {summary.suggestion}
                    </p>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
