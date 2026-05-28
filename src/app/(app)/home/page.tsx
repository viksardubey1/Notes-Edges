'use client';

/**
 * Home / Dashboard — Notes & Edges
 * Route: /home
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Clock, Sparkles, ArrowRight, BookOpen, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { listGraphs, deleteGraph } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';

// ── Mini SVG thumbnail ────────────────────────────────────────────────────────
function MiniGraphPreview({ graph, w = 200, h = 130 }: { graph: GraphData; w?: number; h?: number }) {
  const xs = graph.nodes.map((n) => n.x ?? 0);
  const ys = graph.nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const pad = 16;
  const sx = (x: number) => pad + ((x - minX) / rangeX) * (w - pad * 2);
  const sy = (y: number) => pad + ((y - minY) / rangeY) * (h - pad * 2);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      {graph.edges.slice(0, 60).map((e) => {
        const src = nodeMap.get(e.sourceId), tgt = nodeMap.get(e.targetId);
        if (!src || !tgt) return null;
        return (
          <line
            key={e.id}
            x1={sx(src.x ?? 0)} y1={sy(src.y ?? 0)}
            x2={sx(tgt.x ?? 0)} y2={sy(tgt.y ?? 0)}
            stroke="rgba(123,110,196,0.22)" strokeWidth={1} strokeLinecap="round"
          />
        );
      })}
      {graph.nodes.map((n) => (
        <circle
          key={n.id}
          cx={sx(n.x ?? 0)} cy={sy(n.y ?? 0)}
          r={Math.max(3, (n.size / 24) * 6)}
          fill={n.clusterColor ?? '#9876EE'}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Continue Card ─────────────────────────────────────────────────────────────
function ContinueCard({ graph }: { graph: GraphData }) {
  const router = useRouter();
  const accent = graph.nodes[0]?.clusterColor ?? '#7B6EC4';

  return (
    <motion.button
      onClick={() => router.push(`/graph/${graph.id}`)}
      className="w-full text-left group"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="relative overflow-hidden rounded-[24px] flex gap-0 items-stretch"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 4px 32px rgba(123,110,196,0.10), 0 1px 4px rgba(37,30,61,0.06)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 48px rgba(123,110,196,0.18), 0 2px 8px rgba(37,30,61,0.08)';
          (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}55`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 32px rgba(123,110,196,0.10), 0 1px 4px rgba(37,30,61,0.06)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)';
        }}
      >
        {/* Thumbnail panel */}
        <div
          className="flex-shrink-0 flex items-center justify-center relative overflow-hidden"
          style={{
            width: 280,
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${accent}14 0%, ${accent}05 60%, transparent 100%), var(--bg-surface-2)`,
          }}
        >
          <MiniGraphPreview graph={graph} w={220} h={140} />
          {/* Soft right fade */}
          <div className="absolute inset-y-0 right-0 w-12 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-surface-1))' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-8 py-7">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase mb-3 self-start px-2.5 py-1 rounded-full"
            style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}30` }}
          >
            <Sparkles size={8} />
            Continue learning
          </span>
          <h3
            className="font-[family-name:var(--font-fraunces)] leading-tight mb-3 truncate"
            style={{ fontSize: 28, color: 'var(--text-primary)' }}
          >
            {graph.name}
          </h3>
          <div className="flex items-center gap-5">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {graph.nodeCount} concepts · {graph.edgeCount} connections
            </span>
            <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock size={10} />
              {relativeTime(graph.updatedAt)}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 flex items-center pr-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}
          >
            <ArrowRight size={16} style={{ color: accent }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ── Graph Card ────────────────────────────────────────────────────────────────
function GraphCard({ graph, onDelete }: { graph: GraphData; onDelete: () => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accent = graph.nodes[0]?.clusterColor ?? '#9876EE';

  return (
    <motion.div
      className="group relative flex flex-col rounded-[20px] overflow-hidden cursor-pointer"
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 16px rgba(37,30,61,0.05)',
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
      }}
      onClick={() => router.push(`/graph/${graph.id}`)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(123,110,196,0.14), 0 2px 8px rgba(37,30,61,0.06)`;
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(37,30,61,0.05)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 148,
          background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${accent}10 0%, transparent 70%), var(--bg-surface-2)`,
        }}
      >
        <MiniGraphPreview graph={graph} w={200} h={120} />

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all"
          style={{
            background: 'var(--bg-surface-1)',
            color: 'var(--color-state-weak)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
          aria-label="Delete graph"
        >
          <Trash2 size={11} />
        </button>

        {/* Accent strip at bottom of thumbnail */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px]"
          style={{ background: `linear-gradient(90deg, ${accent}40 0%, transparent 100%)` }} />
      </div>

      {/* Info */}
      <div className="px-4 py-4">
        <p
          className="text-[13px] font-semibold truncate leading-snug mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {graph.name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {graph.nodeCount} concepts
          </p>
          <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={9} />
            {relativeTime(graph.updatedAt)}
          </p>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {confirmDelete && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 rounded-[20px]"
          style={{ background: 'rgba(var(--bg-surface-1-rgb, 255,255,255),0.95)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[13px] font-medium text-center" style={{ color: 'var(--text-primary)' }}>
            Delete &ldquo;{graph.name}&rdquo;?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-4 py-2 rounded-[10px] text-[12px] font-medium"
              style={{ background: 'rgba(208,56,88,0.10)', color: 'var(--color-state-weak)', border: '1px solid rgba(208,56,88,0.25)' }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-[10px] text-[12px] font-medium"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── New Graph Card ────────────────────────────────────────────────────────────
function NewGraphCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-[20px] w-full transition-all"
      style={{
        height: '100%',
        minHeight: 210,
        background: 'transparent',
        border: '2px dashed var(--border-default)',
        color: 'var(--text-muted)',
      }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-glow)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)' }}
      >
        <Plus size={18} style={{ color: 'var(--text-muted)' }} />
      </div>
      <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>New graph</span>
    </motion.button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [graphs, setGraphs] = useState<GraphData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    listGraphs(session.userId).then((g) => {
      setGraphs(g);
      setIsLoaded(true);
    });

    // One-time migration: re-layout all stored graphs to the new spacing.
    // Runs once per browser, tracked by a localStorage flag.
    const MIGRATION_KEY = 'ne_reposition_v14';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      fetch('/api/admin/reposition-graphs', { method: 'POST' })
        .then((r) => r.json())
        .then((result) => {
          if (result.updated != null) {
            localStorage.setItem(MIGRATION_KEY, '1');
            // Reload graph list so thumbnails reflect the new positions
            if (result.updated > 0) {
              listGraphs(session.userId).then(setGraphs);
            }
          }
        })
        .catch(() => { /* non-fatal */ });
    }
  }, [session]);

  const handleDelete = (graphId: string) => {
    if (!session) return;
    void deleteGraph(session.userId, graphId);
    setGraphs((prev) => prev.filter((g) => g.id !== graphId));
  };

  const mostRecent = graphs[0] ?? null;
  const otherGraphs = graphs.slice(1);
  const firstName = session?.name.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 70% 10%, rgba(123,110,196,0.05) 0%, transparent 70%)' }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        className="px-10 pt-10 pb-8 flex-shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-end justify-between max-w-[1280px] mx-auto w-full">
          <div>
            <p className="text-[11px] font-medium tracking-[0.10em] uppercase mb-2" style={{ color: 'var(--accent-primary)', opacity: 0.7 }}>
              {greeting()}
            </p>
            <h1
              className="font-[family-name:var(--font-fraunces)] leading-none tracking-tight"
              style={{ fontSize: 44, color: 'var(--text-primary)' }}
            >
              {firstName || 'Welcome'}.
            </h1>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-muted)' }}>
              {graphs.length === 0
                ? 'Start your first knowledge graph.'
                : graphs.length === 1
                  ? 'Your knowledge map is waiting.'
                  : `${graphs.length} knowledge maps.`}
            </p>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => router.push('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-1)', border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={() => router.push('/welcome?step=2')}
              className="flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #8855CC 0%, #7B6EC4 100%)', boxShadow: '0 2px 12px rgba(123,110,196,0.30)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(123,110,196,0.45)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(123,110,196,0.30)'; }}
            >
              <Plus size={14} />
              New graph
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-10 pb-16 max-w-[1280px] w-full mx-auto">
        {graphs.length === 0 ? (

          /* ── Empty state ─────────────────────────────────────────────────── */
          <motion.div
            className="flex items-center justify-center min-h-[500px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 16 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col items-center gap-6 text-center max-w-[480px]">
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center ambient-float"
                style={{
                  background: 'linear-gradient(135deg, #8855CC 0%, #E8607A 100%)',
                  boxShadow: '0 8px 32px rgba(123,110,196,0.30)',
                }}
              >
                <Sparkles size={32} color="white" />
              </div>
              <div>
                <h2
                  className="font-[family-name:var(--font-fraunces)] leading-snug mb-3"
                  style={{ fontSize: 32, color: 'var(--text-primary)' }}
                >
                  Your first graph starts here.
                </h2>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Paste your lecture notes, a research paper, or anything you want to understand.
                  Watch your ideas become a living knowledge map.
                </p>
              </div>
              <button
                onClick={() => router.push('/welcome?step=2')}
                className="flex items-center gap-2 h-12 px-8 rounded-[14px] text-[14px] font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #8855CC 0%, #7B6EC4 100%)', boxShadow: '0 4px 20px rgba(123,110,196,0.35)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              >
                <BookOpen size={15} />
                Upload my notes
              </button>
            </div>
          </motion.div>

        ) : (
          <div className="flex flex-col gap-8">

            {/* Continue card */}
            {mostRecent && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <ContinueCard graph={mostRecent} />
              </motion.section>
            )}

            {/* All graphs grid */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18 }}
            >
              <h2
                className="text-[11px] font-semibold mb-5 tracking-[0.10em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {graphs.length === 1 ? 'Your graph' : 'All graphs'}
              </h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {(graphs.length > 1 ? otherGraphs : graphs).map((graph, i) => (
                  <motion.div
                    key={graph.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.22 + i * 0.04 }}
                  >
                    <GraphCard graph={graph} onDelete={() => handleDelete(graph.id)} />
                  </motion.div>
                ))}
                <NewGraphCard onClick={() => router.push('/welcome?step=2')} />
              </div>
            </motion.section>

          </div>
        )}
      </div>
    </div>
  );
}
