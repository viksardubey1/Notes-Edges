'use client';

/**
 * AddNodeDialog — Notes & Edges
 *
 * Modal for manually adding a node to the current graph.
 * Places the new node at the center of the current viewport.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useUIStore } from '@/store/ui.store';
import { useAuth } from '@/context/AuthContext';
import { saveGraph } from '@/lib/graphs';
import type { GraphNode } from '@/types/graph';

// Warm cluster fallback colors for manually added nodes
const FALLBACK_COLORS = ['#E07890', '#68B890', '#9884D0', '#C89840', '#60A8C0'];

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface AddNodeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddNodeDialog({ open, onClose }: AddNodeDialogProps) {
  const { graph, pan, zoom, addNodes } = useGraphStore();
  const { openNodeDetail } = useUIStore();
  const selectNode = useGraphStore((s) => s.selectNode);
  const { session } = useAuth();

  const [label, setLabel] = useState('');
  const [type, setType] = useState<GraphNode['type']>('concept');
  const [summary, setSummary] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLabel('');
      setType('concept');
      setSummary('');
      setTimeout(() => labelRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canSubmit = label.trim().length > 0;

  const handleAdd = () => {
    if (!canSubmit || !graph) return;

    const trimLabel = label.trim();
    const baseId = slugify(trimLabel) || 'node';
    // Make id unique
    const existingIds = new Set(graph.nodes.map((n) => n.id));
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id)) { id = `${baseId}-${suffix++}`; }

    // Place node at center of current viewport
    const cx = Math.round(-pan.x / zoom);
    const cy = Math.round(-pan.y / zoom);

    // Pick a cluster color — use first cluster in graph or rotate fallback
    const clusterNode = graph.nodes.find((n) => n.clusterColor);
    const colorIndex = graph.nodes.length % FALLBACK_COLORS.length;
    const clusterColor = clusterNode?.clusterColor ?? FALLBACK_COLORS[colorIndex];
    const clusterId = clusterNode?.clusterId ?? 'cluster-a';
    const clusterName = clusterNode?.clusterName ?? 'Manual';

    const now = new Date().toISOString();
    const node: GraphNode = {
      id,
      label: trimLabel,
      type,
      sourceId: 'manual',
      size: 14,
      centrality: 0.3,
      clusterId,
      clusterColor,
      clusterName,
      createdAt: now,
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 80,
      metadata: {
        summary: summary.trim() || undefined,
        depthLevel: 'surface',
        gaps: [],
        expansionSuggestions: [],
      },
    };

    addNodes([node]);

    // Persist
    const updated = {
      ...graph,
      nodes: [...graph.nodes, node],
      nodeCount: graph.nodes.length + 1,
      updatedAt: now,
    };
    if (session) void saveGraph(session.userId, updated);

    // Select the new node
    selectNode(id);
    openNodeDetail();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(26,22,40,0.35)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="fixed left-1/2 z-50 w-full max-w-[440px] rounded-[16px] overflow-hidden"
            style={{
              top: '22vh',
              transform: 'translateX(-50%)',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 24px 64px rgba(26,22,40,0.18), 0 4px 16px rgba(26,22,40,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Add a concept</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manually add a node to the graph</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Label */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
                  Concept name <span style={{ color: 'var(--accent-warm)' }}>*</span>
                </label>
                <input
                  ref={labelRef}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Reinforcement Learning"
                  className="w-full h-10 px-3 rounded-[8px] text-[14px] outline-none transition-shadow"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    caretColor: 'var(--accent-primary)',
                  }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
                />
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
                  Node type
                </label>
                <div className="flex gap-1.5">
                  {(['concept', 'entity', 'relation', 'orphan'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className="flex-1 py-1.5 rounded-[6px] text-[11px] font-medium capitalize transition-all"
                      style={{
                        background: type === t ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                        color: type === t ? 'var(--accent-primary)' : 'var(--text-muted)',
                        border: type === t ? '1px solid var(--border-default)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
                  Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief description of this concept…"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-[8px] text-[13px] resize-none outline-none transition-shadow leading-relaxed"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    caretColor: 'var(--accent-primary)',
                  }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-[8px] text-[13px] font-medium transition-colors"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!canSubmit || !graph}
                className="flex-1 h-10 rounded-[8px] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: canSubmit && graph ? 'var(--accent-primary)' : 'var(--bg-surface-2)',
                  color: canSubmit && graph ? '#FFFFFF' : 'var(--text-muted)',
                  border: canSubmit && graph ? 'none' : '1px solid var(--border-default)',
                  cursor: canSubmit && graph ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => { if (canSubmit && graph) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
                onMouseLeave={(e) => { if (canSubmit && graph) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
              >
                <Plus size={14} />
                Add concept
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
