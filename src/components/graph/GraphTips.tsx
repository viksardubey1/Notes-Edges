/**
 * GraphTips — Notes & Edges
 *
 * Ephemeral onboarding overlay that appears each time a graph finishes loading.
 * Dismisses automatically after 8 seconds or on the user's first interaction.
 * Shows as a compact pill-row at the bottom-centre of the canvas.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  GitBranch,
  ArrowLeftRight,
  Hand,
  ScanSearch,
  ImagePlus,
} from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

interface GraphTipsProps {
  graphId: string | undefined;
  isLayoutReady: boolean;
}

const TIPS = [
  { icon: MousePointer2, label: 'Click nodes to explore' },
  { icon: GitBranch,     label: 'Click edges to inspect' },
  { icon: ArrowLeftRight, label: '← → to traverse' },
  { icon: Hand,          label: 'Drag to pan' },
  { icon: ScanSearch,    label: 'Scroll to zoom' },
  { icon: ImagePlus,     label: 'Try a background' },
] as const;

const DISMISS_MS = 8_000;

export function GraphTips({ graphId, isLayoutReady }: GraphTipsProps) {
  const { selectedNodeId, selectedEdgeId } = useGraphStore();
  const [visible, setVisible] = useState(false);
  const [seenGraphId, setSeenGraphId] = useState<string | null>(null);

  // Show tips whenever a new graph becomes ready
  useEffect(() => {
    if (!graphId || !isLayoutReady) return;
    if (graphId === seenGraphId) return;
    setSeenGraphId(graphId);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), DISMISS_MS);
    return () => clearTimeout(t);
  }, [graphId, isLayoutReady, seenGraphId]);

  // Dismiss on any selection
  useEffect(() => {
    if (selectedNodeId || selectedEdgeId) setVisible(false);
  }, [selectedNodeId, selectedEdgeId]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="graph-tips"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute bottom-4 left-1/2 z-30 pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-[12px]"
            style={{
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(123,110,196,0.16)',
              boxShadow: '0 2px 16px rgba(37,30,61,0.08), 0 1px 3px rgba(37,30,61,0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {TIPS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i + 0.10, duration: 0.28, ease: 'easeOut' }}
                className="flex items-center gap-1"
              >
                {i > 0 && (
                  <span
                    className="w-px h-2.5 flex-shrink-0"
                    style={{ background: 'rgba(123,110,196,0.15)' }}
                  />
                )}
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-[6px]"
                  style={{ background: 'rgba(107,88,192,0.05)' }}
                >
                  <Icon size={9} style={{ color: 'var(--accent-primary)', opacity: 0.70, flexShrink: 0 }} />
                  <span
                    className="text-[9px] font-medium whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] rounded-b-[16px]"
              style={{ background: 'linear-gradient(90deg, rgba(107,88,192,0.50), rgba(107,88,192,0.15))' }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: DISMISS_MS / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
