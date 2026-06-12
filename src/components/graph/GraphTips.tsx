/**
 * GraphTips — Notes & Edges
 *
 * Lightweight interaction guide that appears at the top-centre of the graph
 * canvas on first load. Fades out automatically, reappears on hover, and can
 * be permanently dismissed (stored in localStorage).
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer2, GitBranch, ArrowLeftRight, Hand, ScanSearch } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';

interface GraphTipsProps {
  graphId: string | undefined;
  isLayoutReady: boolean;
}

const TIPS = [
  { icon: MousePointer2, label: 'Click nodes' },
  { icon: GitBranch,     label: 'Click edges' },
  { icon: ArrowLeftRight, label: '← → traverse' },
  { icon: Hand,          label: 'Drag to pan' },
  { icon: ScanSearch,    label: 'Scroll to zoom' },
] as const;

const AUTO_HIDE_MS = 25_000;

export function GraphTips({ graphId, isLayoutReady }: GraphTipsProps) {
  const { selectedNodeId, selectedEdgeId } = useGraphStore();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Show on every graph load (whenever graphId or isLayoutReady changes to a ready state)
  useEffect(() => {
    if (!graphId || !isLayoutReady) return;
    setVisible(true);
    startTimer();
  }, [graphId, isLayoutReady, startTimer]);

  // Pause timer on hover, restart on leave
  useEffect(() => {
    if (!visible) return;
    if (hovered) stopTimer();
    else startTimer();
  }, [hovered, visible, startTimer, stopTimer]);

  // Hide on any graph selection
  useEffect(() => {
    if (selectedNodeId || selectedEdgeId) setVisible(false);
  }, [selectedNodeId, selectedEdgeId]);

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="graph-tips"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: hovered ? 1 : 0.72, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute z-30"
          style={{
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(123,110,196,0.12)',
              boxShadow: '0 1px 8px rgba(37,30,61,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {TIPS.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-0.5">
                {i > 0 && (
                  <span
                    className="w-px h-2 mx-1 flex-shrink-0"
                    style={{ background: 'rgba(123,110,196,0.15)' }}
                  />
                )}
                <div className="flex items-center gap-1 px-1.5 py-0.5">
                  <Icon size={9} style={{ color: 'var(--accent-primary)', opacity: 0.55, flexShrink: 0 }} />
                  <span
                    className="text-[9px] font-medium whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            ))}

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full transition-colors"
              style={{ color: 'var(--text-muted)', opacity: 0.5 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(107,88,192,0.10)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              aria-label="Dismiss tips"
            >
              <X size={8} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
