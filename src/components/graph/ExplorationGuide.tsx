/**
 * ExplorationGuide — Notes & Edges
 *
 * "Start here" tooltip that physically anchors to the main concept node.
 * - Picks best placement side (above / below / left / right) based on space
 * - Draws an SVG bezier connector from card edge → node surface
 * - Renders pulsing glow rings at the node
 * - Connector dot, path-length draw-in, and card scale-in on open
 */

'use client';

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, MousePointerClick } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { clamp } from '@/lib/utils';
import type { GraphData } from '@/types/graph';

interface ExplorationGuideProps {
  graph: GraphData;
  zoom: number;
  pan: { x: number; y: number };
  dimensions: { width: number; height: number };
  onNodeClick: (nodeId: string) => void;
}

const GAP = 20;       // px between node surface and card edge
const PAD = 20;       // min distance from canvas boundary

type Side = 'above' | 'below' | 'left' | 'right';

function pickSide(
  sx: number, sy: number, nr: number,
  cw: number, ch: number,
  dw: number, dh: number,
): Side {
  if (sy - nr - GAP >= ch + PAD)           return 'above';
  if (dh - sy - nr - GAP >= ch + PAD)      return 'below';
  if (sx - nr - GAP >= cw + PAD)           return 'left';
  return 'right';
}

export function ExplorationGuide({ graph, zoom, pan, dimensions, onNodeClick }: ExplorationGuideProps) {
  const { selectedNodeId } = useGraphStore();
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const [cardSize, setCardSize] = useState({ w: 220, h: 112 });

  // Show on every graph load, hide after 25 s or on selection
  useEffect(() => {
    if (!graph?.id) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 25_000);
    return () => clearTimeout(t);
  }, [graph?.id]);

  useEffect(() => {
    if (selectedNodeId) setVisible(false);
  }, [selectedNodeId]);

  // Measure real card dimensions after mount
  useLayoutEffect(() => {
    if (!visible || !cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setCardSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [visible]);

  // Main concept node
  const mainNode = useMemo(() => {
    const mainId = graph.intelligenceSummary?.mainConcept;
    if (mainId) return graph.nodes.find((n) => n.id === mainId) ?? null;
    return graph.nodes.reduce(
      (best, n) => (n.centrality > (best?.centrality ?? -1) ? n : best),
      null as typeof graph.nodes[0] | null,
    );
  }, [graph.nodes, graph.intelligenceSummary?.mainConcept]);

  // Exploration path: BFS 3 hops
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

  if (!mainNode || dimensions.width === 0 || !visible) return null;

  // ── Screen coordinates ────────────────────────────────────────────────────
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const sx = (mainNode.x ?? 0) * zoom + cx + pan.x;
  const sy = (mainNode.y ?? 0) * zoom + cy + pan.y;
  const nr = (mainNode.size ?? 12) * zoom;

  if (sx < -100 || sx > dimensions.width + 100) return null;
  if (sy < -100 || sy > dimensions.height + 100) return null;

  // ── Placement ─────────────────────────────────────────────────────────────
  const { w: cw, h: ch } = cardSize;
  const side = pickSide(sx, sy, nr, cw, ch, dimensions.width, dimensions.height);

  // Card position (CSS left / top) and transform
  let cardCSSLeft: number;
  let cardCSSTop: number;
  let cardTransform: string;

  // Connector endpoints
  let connCardX: number;
  let connCardY: number;
  let connNodeX: number;
  let connNodeY: number;

  switch (side) {
    case 'above': {
      cardCSSLeft = clamp(sx, cw / 2 + PAD, dimensions.width - cw / 2 - PAD);
      cardCSSTop  = sy - nr - GAP - ch;
      cardTransform = 'translateX(-50%)';
      connCardX = cardCSSLeft;
      connCardY = cardCSSTop + ch;
      connNodeX = sx;
      connNodeY = sy - nr;
      break;
    }
    case 'below': {
      cardCSSLeft = clamp(sx, cw / 2 + PAD, dimensions.width - cw / 2 - PAD);
      cardCSSTop  = sy + nr + GAP;
      cardTransform = 'translateX(-50%)';
      connCardX = cardCSSLeft;
      connCardY = cardCSSTop;
      connNodeX = sx;
      connNodeY = sy + nr;
      break;
    }
    case 'left': {
      cardCSSLeft = sx - nr - GAP - cw;
      cardCSSTop  = clamp(sy, ch / 2 + PAD, dimensions.height - ch / 2 - PAD);
      cardTransform = 'translateY(-50%)';
      connCardX = cardCSSLeft + cw;
      connCardY = cardCSSTop;
      connNodeX = sx - nr;
      connNodeY = sy;
      break;
    }
    default: { // right
      cardCSSLeft = sx + nr + GAP;
      cardCSSTop  = clamp(sy, ch / 2 + PAD, dimensions.height - ch / 2 - PAD);
      cardTransform = 'translateY(-50%)';
      connCardX = cardCSSLeft;
      connCardY = cardCSSTop;
      connNodeX = sx + nr;
      connNodeY = sy;
      break;
    }
  }

  // ── Bezier control points ─────────────────────────────────────────────────
  const dist = Math.sqrt((connNodeX - connCardX) ** 2 + (connNodeY - connCardY) ** 2);
  const bend = Math.min(dist * 0.38, 55);

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  switch (side) {
    case 'above':
      cp1x = connCardX; cp1y = connCardY + bend;
      cp2x = connNodeX; cp2y = connNodeY - bend;
      break;
    case 'below':
      cp1x = connCardX; cp1y = connCardY - bend;
      cp2x = connNodeX; cp2y = connNodeY + bend;
      break;
    case 'left':
      cp1x = connCardX + bend; cp1y = connCardY;
      cp2x = connNodeX - bend; cp2y = connNodeY;
      break;
    default: // right
      cp1x = connCardX - bend; cp1y = connCardY;
      cp2x = connNodeX + bend; cp2y = connNodeY;
  }

  const pathD = `M ${connCardX} ${connCardY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${connNodeX} ${connNodeY}`;

  return (
    <AnimatePresence>
      {/* SVG layer: glow rings + connector */}
      <motion.svg
        key="guide-svg"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 19, overflow: 'visible' }}
        width={dimensions.width}
        height={dimensions.height}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Outer glow pulse */}
        <motion.circle
          cx={sx} cy={sy} r={nr + 10}
          fill="none"
          stroke="rgba(107,88,192,0.14)"
          strokeWidth={1}
          animate={{ r: [nr + 10, nr + 18, nr + 10], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
        {/* Inner glow ring */}
        <motion.circle
          cx={sx} cy={sy} r={nr + 5}
          fill="none"
          stroke="rgba(107,88,192,0.42)"
          strokeWidth={1.5}
          animate={{ r: [nr + 5, nr + 9, nr + 5], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Bezier connector */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="rgba(107,88,192,0.32)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Anchor dot at node surface */}
        <motion.circle
          cx={connNodeX} cy={connNodeY} r={3.5}
          fill="rgba(107,88,192,0.55)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.55 }}
          style={{ transformOrigin: `${connNodeX}px ${connNodeY}px` }}
        />

        {/* Anchor dot at card edge */}
        <motion.circle
          cx={connCardX} cy={connCardY} r={2.5}
          fill="rgba(107,88,192,0.40)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.45 }}
          style={{ transformOrigin: `${connCardX}px ${connCardY}px` }}
        />
      </motion.svg>

      {/* Card */}
      <motion.div
        key="guide-card"
        className="absolute z-20"
        style={{ left: cardCSSLeft, top: cardCSSTop, transform: cardTransform }}
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Pulsing outer glow ring */}
        <motion.div
          animate={{
            boxShadow: [
              '0 4px 20px rgba(37,30,61,0.08), 0 0 0 0px rgba(107,88,192,0)',
              '0 6px 28px rgba(107,88,192,0.22), 0 0 0 4px rgba(107,88,192,0.10)',
              '0 4px 20px rgba(37,30,61,0.08), 0 0 0 0px rgba(107,88,192,0)',
            ],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-[12px]"
        >
          <motion.button
            ref={cardRef}
            onClick={(e) => { e.stopPropagation(); onNodeClick(mainNode.id); setVisible(false); }}
            className="flex flex-col gap-2 px-3.5 py-3 rounded-[12px] text-left"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              minWidth: 180,
              maxWidth: 240,
              cursor: 'pointer',
              borderWidth: '1.5px',
              borderStyle: 'solid',
            }}
            animate={{
              borderColor: [
                'rgba(107,88,192,0.25)',
                'rgba(107,88,192,0.65)',
                'rgba(107,88,192,0.25)',
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6], rotate: [0, 14, -14, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Compass size={12} style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <span
                  className="text-[11px] uppercase tracking-[0.10em] font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Start here
                </span>
              </div>
              <motion.span
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ background: 'rgba(107,88,192,0.10)', color: 'var(--accent-primary)' }}
              >
                <MousePointerClick size={10} />
                click to open
              </motion.span>
            </div>

            {/* Core concept label */}
            <p
              className="text-[13px] font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {mainNode.label}
            </p>

            {/* Exploration path */}
            {explorationPath.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <p
                  className="text-[9px] uppercase tracking-[0.06em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Then explore
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {explorationPath.map((label, i) => (
                    <span key={label} className="flex items-center gap-1">
                      {i > 0 && (
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>→</span>
                      )}
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
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
