'use client';

/**
 * UploadSheet — Notes & Edges
 *
 * Bottom sheet for uploading notes. Two modes:
 *   - "new"    → replaces the current graph entirely
 *   - "append" → extracts concepts from new notes and merges them into the
 *                existing graph (deduplicates by label, adds novel nodes + edges)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle, PlusCircle, RefreshCw, Info } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useGraphStore } from '@/store/graph.store';
import { useAuth } from '@/context/AuthContext';
import { saveGraph } from '@/lib/graphs';
import { cn } from '@/lib/utils';
import type { GraphData, GraphNode, GraphEdge } from '@/types/graph';
import posthog from 'posthog-js';

// ── Merge helper ──────────────────────────────────────────────────────────────

/**
 * Merge `incoming` graph into `existing` graph.
 * - Deduplicates nodes by lowercase label (existing wins).
 * - Offsets incoming node positions so they don't land on top of existing ones.
 * - Re-maps incoming edge IDs to surviving node IDs.
 * - Skips duplicate edges (same source+target pair).
 */
function mergeGraphs(existing: GraphData, incoming: GraphData): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Build label → id map of existing nodes
  const existingByLabel = new Map<string, string>();
  for (const n of existing.nodes) existingByLabel.set(n.label.toLowerCase(), n.id);

  // Work out a positional offset for incoming nodes so they don't overlap
  const xs = existing.nodes.map((n) => n.x ?? 0);
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;
  const offsetX = maxX + 320;

  // Incoming id → final id (either existing node id or the incoming node's own id)
  const idMap = new Map<string, string>();
  const newNodes: GraphNode[] = [];

  for (const n of incoming.nodes) {
    const existingId = existingByLabel.get(n.label.toLowerCase());
    if (existingId) {
      // Node already exists — map incoming id to existing id, skip adding
      idMap.set(n.id, existingId);
    } else {
      // Novel node — keep it, offset its position
      idMap.set(n.id, n.id);
      newNodes.push({ ...n, x: (n.x ?? 0) + offsetX });
    }
  }

  // Re-map edges to surviving ids; skip self-loops and pairs that already have an edge
  const existingPairs = new Set(existing.edges.map((e) => `${e.sourceId}|${e.targetId}`));
  const edgeOffset = existing.edges.length;
  const newEdges: GraphEdge[] = [];

  for (const e of incoming.edges) {
    const src = idMap.get(e.sourceId);
    const tgt = idMap.get(e.targetId);
    if (!src || !tgt || src === tgt) continue;
    const pairKey = `${src}|${tgt}`;
    const reversePairKey = `${tgt}|${src}`;
    if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) continue;
    existingPairs.add(pairKey);
    newEdges.push({
      ...e,
      id: `e${edgeOffset + newEdges.length + 1}`,
      sourceId: src,
      targetId: tgt,
    });
  }

  return { nodes: newNodes, edges: newEdges };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadSheet() {
  const { uploadSheetOpen, closeUploadSheet, breakpoint } = useUIStore();
  const { setGenerating, setGraph, graph, addNodes, addEdges } = useGraphStore();
  const { session } = useAuth();

  const [mode, setMode] = useState<'new' | 'append'>('new');
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('text');
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = breakpoint === 'mobile';
  const hasGraph = graph !== null;
  const charCount = text.length;
  const canSubmit = (activeTab === 'text' && charCount > 5) || (activeTab === 'pdf' && droppedFile !== null);

  // Default to 'append' if a graph is already loaded when sheet opens
  useEffect(() => {
    if (uploadSheetOpen) setMode(hasGraph ? 'append' : 'new');
  }, [uploadSheetOpen, hasGraph]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploadSheetOpen) closeUploadSheet();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [uploadSheetOpen, closeUploadSheet]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === 'application/pdf') {
      setDroppedFile(file);
      setSubmitError(null);
      setActiveTab('pdf');
    } else {
      setSubmitError(`Unsupported file type: ${file.name.split('.').pop()?.toUpperCase() ?? 'unknown'}. Only PDF files are supported — paste text instead for other formats.`);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setGenerating(true);

    try {
      const form = new FormData();
      if (activeTab === 'text') {
        form.append('text', text);
      } else if (droppedFile) {
        form.append('pdf', droppedFile);
      }

      const res = await fetch('/api/extract-graph', { method: 'POST', body: form });
      const data = (await res.json()) as { graph?: GraphData; error?: string };
      if (!res.ok || !data.graph) throw new Error(data.error ?? 'Extraction failed');

      if (mode === 'append' && graph) {
        // Merge incoming graph into existing
        const { nodes: newNodes, edges: newEdges } = mergeGraphs(graph, data.graph);
        addNodes(newNodes);
        addEdges(newEdges);
        // Persist the merged state
        const merged: GraphData = {
          ...graph,
          nodes: [...graph.nodes, ...newNodes],
          edges: [...graph.edges, ...newEdges],
          nodeCount: graph.nodes.length + newNodes.length,
          edgeCount: graph.edges.length + newEdges.length,
          updatedAt: new Date().toISOString(),
        };
        if (session) void saveGraph(session.userId, merged);
        posthog.capture('graph_notes_appended', {
          graph_id: graph.id,
          new_nodes_added: newNodes.length,
          new_edges_added: newEdges.length,
          input_type: activeTab,
        });
      } else {
        // Replace graph entirely
        if (session) void saveGraph(session.userId, data.graph);
        setGraph(data.graph);
        posthog.capture('graph_replaced', {
          graph_id: data.graph.id,
          node_count: data.graph.nodeCount,
          edge_count: data.graph.edgeCount,
          input_type: activeTab,
        });
      }

      setText('');
      setDroppedFile(null);
      closeUploadSheet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
    } finally {
      setGenerating(false);
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, mode, activeTab, text, droppedFile, graph, closeUploadSheet, setGenerating, setGraph, addNodes, addEdges]);

  const ctaLabel = isSubmitting
    ? 'Extracting…'
    : mode === 'append'
      ? 'Add to graph'
      : 'Generate graph';

  return (
    <AnimatePresence>
      {uploadSheetOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
            onClick={closeUploadSheet}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[110] flex flex-col"
            style={{
              height: isMobile ? '100dvh' : hasGraph ? 560 : 500,
              background: 'var(--bg-surface-1)',
              borderTop: '1px solid var(--border-default)',
              borderRadius: isMobile ? 0 : '16px 16px 0 0',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Upload notes"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-[17px] font-medium" style={{ color: 'var(--text-primary)' }}>Upload notes</h2>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Paste text or upload a PDF — AI will map the concepts.
                </p>
              </div>
              <button
                onClick={closeUploadSheet}
                className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                aria-label="Close upload sheet"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode toggle — only visible when a graph is already loaded */}
            {hasGraph && (
              <div className="flex gap-1.5 px-6 mb-3 flex-shrink-0">
                <button
                  onClick={() => setMode('append')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                  style={{
                    background: mode === 'append' ? 'var(--accent-glow)' : 'transparent',
                    color: mode === 'append' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: mode === 'append' ? '1px solid var(--border-default)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <PlusCircle size={12} />
                  Add to current graph
                </button>
                <button
                  onClick={() => setMode('new')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                  style={{
                    background: mode === 'new' ? 'rgba(224,88,120,0.10)' : 'transparent',
                    color: mode === 'new' ? 'var(--accent-warm)' : 'var(--text-secondary)',
                    border: mode === 'new' ? '1px solid rgba(224,88,120,0.25)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <RefreshCw size={12} />
                  Replace graph
                </button>
                {mode === 'append' && (
                  <p className="ml-auto text-[10px] self-center" style={{ color: 'var(--text-muted)' }}>
                    New concepts will be added alongside existing ones
                  </p>
                )}
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1 px-6 mb-4 flex-shrink-0">
              {(['text', 'pdf'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors"
                  style={{
                    background: activeTab === tab ? 'var(--bg-surface-2)' : 'transparent',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: activeTab === tab ? '1px solid var(--border-default)' : '1px solid transparent',
                  }}
                >
                  {tab === 'text' ? <FileText size={12} /> : <Upload size={12} />}
                  {tab === 'text' ? 'Paste text' : 'Upload PDF'}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="flex-1 px-6 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'text' ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col gap-2"
                  >
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        mode === 'append'
                          ? 'Paste additional notes to expand this graph with new concepts…'
                          : 'Paste your lecture notes, research paper, article, or any text here…'
                      }
                      className="flex-1 w-full resize-none rounded-[10px] p-4 text-[14px] leading-relaxed outline-none transition-shadow"
                      style={{
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        caretColor: 'var(--accent-primary)',
                        minHeight: 0,
                      }}
                      onFocus={(e) => {
                        e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)';
                        e.target.style.borderColor = 'var(--accent-primary)';
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = 'none';
                        e.target.style.borderColor = 'var(--border-default)';
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end">
                      <span className="text-[11px]" style={{ color: charCount > 5 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {charCount.toLocaleString()} characters
                        {charCount > 5 && ' · ready'}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="pdf"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col gap-2 pb-2"
                  >
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex flex-col items-center justify-center gap-4 rounded-[10px] border-2 border-dashed cursor-pointer transition-colors"
                      style={{
                        borderColor: isDragging ? 'var(--accent-primary)' : droppedFile ? '#38A870' : 'var(--border-default)',
                        background: isDragging ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                      }}
                    >
                      {droppedFile ? (
                        <>
                          <div className="w-12 h-12 flex items-center justify-center rounded-[10px]" style={{ background: '#6A9A7A22' }}>
                            <FileText size={24} color="#6A9A7A" />
                          </div>
                          <div className="text-center">
                            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{droppedFile.name}</p>
                            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {(droppedFile.size / 1024 / 1024).toFixed(1)} MB · ready to process
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDroppedFile(null); }}
                            className="text-[12px] transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 flex items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-surface-3)' }}>
                            <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div className="text-center">
                            <p className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Drop a PDF here</p>
                            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>or click to browse · up to 50MB</p>
                          </div>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setDroppedFile(f); setSubmitError(null); }
                        }}
                      />
                    </div>
                    <div
                      className="flex items-start gap-1.5 px-3 py-2 rounded-[8px] text-[11px] flex-shrink-0"
                      style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    >
                      <Info size={11} className="flex-shrink-0 mt-px" />
                      <span>
                        Currently works best with <strong style={{ color: 'var(--text-primary)' }}>text-heavy PDFs</strong> — lecture notes, papers, articles. Support for image-heavy and handwritten PDFs is in development.
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA */}
            <div className="px-6 py-5 flex-shrink-0 flex flex-col gap-3">
              {submitError && (
                <div
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-[8px] text-[12px]"
                  style={{ background: '#D4587811', border: '1px solid #D4587833', color: '#D45878' }}
                >
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={!canSubmit || isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition-all"
                style={{
                  background: canSubmit ? 'var(--accent-primary)' : 'var(--bg-surface-2)',
                  color: canSubmit ? '#FFFFFF' : 'var(--text-muted)',
                  border: canSubmit ? 'none' : '1px solid var(--border-default)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.7,
                }}
                onMouseEnter={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
                onMouseLeave={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
              >
                {isSubmitting ? (
                  <span className="animate-[shimmer-opacity_2.4s_ease-in-out_infinite]">{ctaLabel}</span>
                ) : (
                  ctaLabel
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
