/**
 * SearchPalette — Notes & Edges
 *
 * Cmd+K command palette for searching nodes across the graph.
 * - Fuzzy-ish search on label, summary, cluster name
 * - Selecting a result navigates the canvas to that node
 * - Dimming: non-matching nodes fade to ~8% opacity on canvas
 * - Escape / outside click closes and resets filter
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useGraphStore } from '@/store/graph.store';
import type { GraphNode } from '@/types/graph';

function scoreMatch(node: GraphNode, query: string): number {
  const q = query.toLowerCase();
  const label = node.label.toLowerCase();
  const summary = (node.metadata?.summary ?? '').toLowerCase();
  const cluster = (node.clusterName ?? '').toLowerCase();

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (cluster.includes(q)) return 40;
  if (summary.includes(q)) return 20;
  return 0;
}

export function SearchPalette() {
  const { searchPaletteOpen, closeSearchPalette } = useUIStore();
  const { graph, selectNode, setFilteredNodes, setSearchQuery } = useGraphStore();
  const { openNodeDetail } = useUIStore();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter + rank results
  const results = useMemo(() => {
    if (!graph || query.trim().length < 1) return graph?.nodes.slice(0, 8) ?? [];
    return graph.nodes
      .map((n) => ({ node: n, score: scoreMatch(n, query.trim()) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.node);
  }, [graph, query]);

  // Keep canvas filtered in sync with query
  useEffect(() => {
    if (!graph) return;
    if (query.trim().length < 1) {
      setFilteredNodes(null);
      setSearchQuery('');
      return;
    }
    const ids = new Set(results.map((n) => n.id));
    setFilteredNodes(ids);
    setSearchQuery(query.trim());
  }, [query, results, graph, setFilteredNodes, setSearchQuery]);

  // Reset when closed
  useEffect(() => {
    if (!searchPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      setFilteredNodes(null);
      setSearchQuery('');
    } else {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [searchPaletteOpen, setFilteredNodes, setSearchQuery]);

  // Keep active index in bounds when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Scroll active item into view
  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectResult = useCallback((node: GraphNode) => {
    selectNode(node.id);
    openNodeDetail();
    // Keep the filter so the canvas stays highlighted
    const ids = new Set(results.map((n) => n.id));
    setFilteredNodes(ids.size > 0 ? ids : null);
    closeSearchPalette();
  }, [selectNode, openNodeDetail, results, setFilteredNodes, closeSearchPalette]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearchPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      selectResult(results[activeIndex]);
    }
  }, [results, activeIndex, selectResult, closeSearchPalette]);

  return (
    <AnimatePresence>
      {searchPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(26, 22, 40, 0.40)', backdropFilter: 'blur(6px)' }}
            onClick={closeSearchPalette}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="fixed left-1/2 z-[110] w-full max-w-[540px] overflow-hidden rounded-[20px]"
            style={{
              top: '18vh',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 24px 80px rgba(26,22,40,0.18), 0 4px 16px rgba(26,22,40,0.08)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Search input row */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={graph ? `Search ${graph.nodes.length} concepts…` : 'No graph loaded'}
                disabled={!graph}
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: 'var(--text-primary)' }}
              />
              {query.length > 0 && (
                <button
                  onClick={() => setQuery('')}
                  className="flex-shrink-0 p-1 rounded-[6px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <X size={13} />
                </button>
              )}
              <kbd
                className="flex-shrink-0 px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
              >
                esc
              </kbd>
            </div>

            {/* Results */}
            {graph ? (
              <ul
                ref={listRef}
                className="overflow-y-auto py-2"
                style={{ maxHeight: '360px' }}
              >
                {results.length === 0 && query.trim().length > 0 ? (
                  <li className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    No concepts match &ldquo;{query}&rdquo;
                  </li>
                ) : (
                  results.map((node, i) => {
                    const isActive = i === activeIndex;
                    return (
                      <li key={node.id}>
                        <button
                          className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all"
                          style={{
                            background: isActive ? 'var(--accent-glow)' : 'transparent',
                          }}
                          onClick={() => selectResult(node)}
                          onMouseEnter={() => setActiveIndex(i)}
                        >
                          {/* Cluster dot */}
                          <span
                            className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                            style={{ background: node.clusterColor ?? 'var(--accent-primary)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[13px] font-medium truncate"
                              style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                            >
                              {node.label}
                            </p>
                            {node.clusterName && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {node.clusterName}
                              </p>
                            )}
                            {node.metadata?.summary && (
                              <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                                {node.metadata.summary}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <kbd
                              className="flex-shrink-0 self-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium"
                              style={{ background: 'var(--bg-surface-2)', color: 'var(--accent-primary)', border: '1px solid var(--border-default)' }}
                            >
                              ↵
                            </kbd>
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Open a graph first to search concepts
              </div>
            )}

            {/* Footer hint */}
            {graph && results.length > 0 && (
              <div
                className="flex items-center gap-4 px-4 py-2 border-t text-[10px]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span><kbd className="px-1 rounded" style={{ background: 'var(--bg-surface-2)' }}>↑↓</kbd> navigate</span>
                <span><kbd className="px-1 rounded" style={{ background: 'var(--bg-surface-2)' }}>↵</kbd> select</span>
                <span><kbd className="px-1 rounded" style={{ background: 'var(--bg-surface-2)' }}>esc</kbd> close</span>
                {query && <span className="ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
