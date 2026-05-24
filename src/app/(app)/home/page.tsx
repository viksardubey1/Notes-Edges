'use client';

/**
 * Home / Dashboard — Notes & Edges
 * Route: /home
 *
 * A warm, guided learning workspace. Shows recent graphs, progress,
 * and a "continue where you left off" moment. Light mode first.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Clock, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSession } from '@/lib/auth';
import { listGraphs, deleteGraph } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';

// ── Mini SVG thumbnail (light-friendly) ──────────────────────────────────────
function MiniGraphPreview({ graph }: { graph: GraphData }) {
  const W = 160, H = 100;
  const xs = graph.nodes.map((n) => n.x ?? 0);
  const ys = graph.nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const pad = 12;
  const sx = (x: number) => pad + ((x - minX) / rangeX) * (W - pad * 2);
  const sy = (y: number) => pad + ((y - minY) / rangeY) * (H - pad * 2);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden="true">
      {graph.edges.slice(0, 50).map((e) => {
        const src = nodeMap.get(e.sourceId), tgt = nodeMap.get(e.targetId);
        if (!src || !tgt) return null;
        return (
          <line
            key={e.id}
            x1={sx(src.x ?? 0)} y1={sy(src.y ?? 0)}
            x2={sx(tgt.x ?? 0)} y2={sy(tgt.y ?? 0)}
            stroke="var(--color-edge-default)" strokeWidth={0.9} strokeLinecap="round"
          />
        );
      })}
      {graph.nodes.map((n) => (
        <circle
          key={n.id}
          cx={sx(n.x ?? 0)} cy={sy(n.y ?? 0)}
          r={Math.max(2.5, (n.size / 24) * 5.5)}
          fill={n.clusterColor ?? 'var(--color-cluster-c)'}
          opacity={0.80}
        />
      ))}
    </svg>
  );
}

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Continue Card (most recent graph, prominent) ──────────────────────────────
function ContinueCard({ graph }: { graph: GraphData }) {
  const router = useRouter();
  return (
    <motion.button
      onClick={() => router.push(`/graph/${graph.id}`)}
      className="w-full text-left group"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="relative overflow-hidden rounded-[20px] p-5 flex gap-5 items-center"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--card-shadow)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--card-shadow-hover)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--card-shadow)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)';
        }}
      >
        {/* Gradient accent stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px]"
          style={{ background: 'linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-warm) 100%)' }}
        />

        {/* Graph thumbnail */}
        <div
          className="flex-shrink-0 rounded-[14px] overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--bg-surface-2)', width: 160, height: 100 }}
        >
          <MiniGraphPreview graph={graph} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
            >
              Continue learning
            </span>
          </div>
          <h3
            className="font-light tracking-tight text-[22px] leading-tight mb-2 truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {graph.name}
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {graph.nodeCount} concepts · {graph.edgeCount} connections
            </span>
            <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} />
              {relativeTime(graph.updatedAt)}
            </span>
          </div>
        </div>

        {/* CTA arrow */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
        >
          <ArrowRight
            size={18}
            className="group-hover:translate-x-0.5 transition-transform"
            style={{ color: 'var(--accent-primary)' }}
          />
        </div>
      </div>
    </motion.button>
  );
}

// ── Graph Card ────────────────────────────────────────────────────────────────
function GraphCard({ graph, onDelete }: { graph: GraphData; onDelete: () => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      className="group relative flex flex-col rounded-[18px] overflow-hidden cursor-pointer"
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--card-shadow)',
        transition: 'box-shadow 200ms ease, border-color 200ms ease, transform 200ms ease',
      }}
      onClick={() => router.push(`/graph/${graph.id}`)}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={(e) => {
        const el = (e.currentTarget as HTMLElement).querySelector('[data-card-inner]') as HTMLDivElement | null;
        if (el) { el.style.boxShadow = 'var(--card-shadow-hover)'; el.style.borderColor = 'var(--accent-primary)'; }
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center py-6 px-4"
        style={{ background: 'var(--bg-surface-2)' }}
      >
        <MiniGraphPreview graph={graph} />
        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all"
          style={{
            background: 'var(--bg-surface-1)',
            color: 'var(--color-state-weak)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
          aria-label="Delete graph"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Info */}
      <div
        className="px-4 py-3.5 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <p
          className="text-[13px] font-semibold truncate leading-snug mb-1.5"
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
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 rounded-[18px]"
          style={{ background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[13px] font-medium text-center" style={{ color: 'var(--text-primary)' }}>
            Delete &ldquo;{graph.name}&rdquo;?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-4 py-2 rounded-[10px] text-[12px] font-medium transition-colors"
              style={{
                background: 'rgba(208, 56, 88, 0.10)',
                color: 'var(--color-state-weak)',
                border: '1px solid rgba(208, 56, 88, 0.25)',
              }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-[10px] text-[12px] font-medium transition-colors"
              style={{
                background: 'var(--bg-surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
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
      className="flex flex-col items-center justify-center gap-3 rounded-[18px] py-10 w-full transition-all"
      style={{
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
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)' }}
      >
        <Plus size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
      <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>New graph</span>
    </motion.button>
  );
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [graphs, setGraphs] = useState<GraphData[]>([]);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setUserName(session.name);
    setUserId(session.userId);
    setGraphs(listGraphs(session.userId));
    setIsLoaded(true);
  }, []);

  const handleDelete = (graphId: string) => {
    deleteGraph(userId, graphId);
    setGraphs((prev) => prev.filter((g) => g.id !== graphId));
  };

  const mostRecent = graphs[0] ?? null;
  const otherGraphs = graphs.slice(1);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        className="px-8 pt-12 pb-6 flex-shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 12 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-start justify-between max-w-5xl mx-auto w-full">
          <div>
            <h1
              className="font-light tracking-tight text-[34px] leading-tight mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}.
            </h1>
            <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>
              {graphs.length === 0
                ? 'Start your first knowledge graph.'
                : graphs.length === 1
                  ? 'Your knowledge map is waiting.'
                  : `You have ${graphs.length} knowledge maps.`}
            </p>
          </div>
          <button
            onClick={() => router.push('/welcome?step=2')}
            className="flex items-center gap-2 h-10 px-5 rounded-[12px] text-[13px] font-semibold text-white transition-all flex-shrink-0"
            style={{ background: 'var(--accent-primary)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px var(--accent-glow)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)';
              (e.currentTarget as HTMLButtonElement).style.transform = '';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
            }}
          >
            <Plus size={14} />
            New graph
          </button>
        </div>
      </motion.div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-8 pb-16 max-w-5xl w-full mx-auto">
        {graphs.length === 0 ? (

          /* ── Empty state ───────────────────────────────────────────────── */
          <motion.div
            className="flex items-center justify-center min-h-[400px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 16 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex flex-col items-center gap-6 text-center max-w-[440px]">
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center ambient-float"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-surface-2) 0%, var(--bg-surface-3) 100%)',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 8px 32px var(--accent-glow)',
                }}
              >
                <Sparkles size={32} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h2
                  className="font-light tracking-tight text-[28px] leading-snug mb-3"
                  style={{ color: 'var(--text-primary)' }}
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
                style={{ background: 'var(--accent-primary)', boxShadow: '0 4px 20px var(--accent-glow)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px var(--accent-glow)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px var(--accent-glow)';
                }}
              >
                <BookOpen size={15} />
                Upload my notes
              </button>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Works with lecture notes, PDFs, articles, and research papers
              </p>
            </div>
          </motion.div>

        ) : (
          <div className="flex flex-col gap-8">

            {/* ── Continue where you left off ─────────────────────────────── */}
            {mostRecent && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <ContinueCard graph={mostRecent} />
              </motion.section>
            )}

            {/* ── All graphs grid ─────────────────────────────────────────── */}
            {(otherGraphs.length > 0 || graphs.length > 0) && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h2
                  className="text-[13px] font-semibold mb-4 tracking-wide uppercase"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
                >
                  {graphs.length === 1 ? 'Your graph' : 'All graphs'}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {(graphs.length > 1 ? otherGraphs : graphs).map((graph, i) => (
                    <motion.div
                      key={graph.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                    >
                      <GraphCard
                        graph={graph}
                        onDelete={() => handleDelete(graph.id)}
                      />
                    </motion.div>
                  ))}
                  <NewGraphCard onClick={() => router.push('/welcome?step=2')} />
                </div>
              </motion.section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
