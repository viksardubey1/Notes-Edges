/**
 * ExplorationGuide — Notes & Edges
 *
 * Floating "Start here" overlay that appears on first graph load.
 * - Points to the highest-centrality (core) concept
 * - Shows the first 3 exploration hops as a path
 * - Disappears on first node click or after 12 seconds
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, MousePointerClick } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import type { GraphData } from '@/types/graph';

interface ExplorationGuideProps {
  graph: GraphData;
  zoom: number;
  pan: { x: number; y: number };
  dimensions: { width: number; height: number };
  onNodeClick: (nodeId: string) => void;
}

export function ExplorationGuide({ graph, zoom, pan, dimensions, onNodeClick }: ExplorationGuideProps) {
  const { selectedNodeId } = useGraphStore();
  const [visible, setVisible] = useState(false);
  const [graphKey, setGraphKey] = useState<string | null>(null);

  // Show when a new graph loads, hide after 12s or first selection
  useEffect(() => {
    if (!graph?.id) return;
    if (graph.id === graphKey) return;
    setGraphKey(graph.id);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 12_000);
    return () => clearTimeout(t);
  }, [graph?.id, graphKey]);

  useEffect(() => {
    if (selectedNodeId) setVisible(false);
  }, [selectedNodeId]);

  // Find the main concept node
  const mainNode = useMemo(() => {
    const mainId = graph.intelligenceSummary?.mainConcept;
    if (mainId) return graph.nodes.find((n) => n.id === mainId) ?? null;
    // Fall back to highest centrality
    return graph.nodes.reduce(
      (best, n) => (n.centrality > (best?.centrality ?? -1) ? n : best),
      null as typeof graph.nodes[0] | null,
    );
  }, [graph.nodes, graph.intelligenceSummary?.mainConcept]);

  // Exploration path: BFS 3 hops from main node
  const explorationPath = useMemo(() => {
    if (!mainNode) return [];
    const path: string[] = [];
    const visited = new Set([mainNode.id]);
    let frontier = [mainNode.id];
    while (path.length < 3 && frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const e of graph.edges) {
          const nbr = e.sourceId === id ? e.targetId : e.targetId === id ? e.sourceId : null;
          if (nbr && !visited.has(nbr)) {
            visited.add(nbr);
            next.push(nbr);
            const node = graph.nodes.find((n) => n.id === nbr);
            if (node) path.push(node.label);
            if (path.length >= 3) break;
          }
        }
        if (path.length >= 3) break;
      }
      frontier = next;
    }
    return path;
  }, [mainNode, graph.nodes, graph.edges]);

  if (!mainNode || !visible) return null;

  // Project node position to screen coordinates
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const screenX = (mainNode.x ?? 0) * zoom + cx + pan.x;
  const screenY = (mainNode.y ?? 0) * zoom + cy + pan.y;
  const nodeRadius = (mainNode.size ?? 12) * zoom;

  // Position tooltip above the node
  const tooltipX = Math.min(Math.max(screenX, 120), dimensions.width - 120);
  const tooltipY = screenY - nodeRadius - 16;

  // Don't render if node is off-screen
  if (screenX < -100 || screenX > dimensions.width + 100) return null;
  if (screenY < -100 || screenY > dimensions.height + 100) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute z-20"
          style={{
            left: tooltipX,
            top: tooltipY,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Tooltip card — clickable */}
          <button
            onClick={(e) => { e.stopPropagation(); onNodeClick(mainNode.id); setVisible(false); }}
            className="flex flex-col gap-2 px-3.5 py-3 rounded-[12px] text-left w-full group"
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              border: '1px solid rgba(123, 110, 196, 0.22)',
              boxShadow: '0 4px 24px rgba(37,30,61,0.10), 0 1px 4px rgba(37,30,61,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              minWidth: 180,
              maxWidth: 240,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.50)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(123,110,196,0.18), 0 1px 4px rgba(37,30,61,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.22)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(37,30,61,0.10), 0 1px 4px rgba(37,30,61,0.06)';
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Compass size={11} style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <span className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: 'var(--accent-primary)' }}>
                  Start here
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <MousePointerClick size={10} />
                click to open
              </span>
            </div>

            {/* Core concept */}
            <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {mainNode.label}
            </p>

            {/* Exploration path */}
            {explorationPath.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[9px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>Then explore</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {explorationPath.map((label, i) => (
                    <span key={label} className="flex items-center gap-1">
                      {i > 0 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>→</span>}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-[4px]"
                        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                      >
                        {label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </button>

          {/* Arrow pointer */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: -6,
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(123,110,196,0.16)',
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: -5,
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(255,255,255,0.94)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
