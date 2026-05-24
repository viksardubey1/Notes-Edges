/**
 * SidebarProjectList — Notes & Edges
 *
 * Shows the authenticated user's real saved graphs.
 * Clicking a graph navigates to it. Active graph is highlighted.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { getSession } from '@/lib/auth';
import { listGraphs } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';

// ── Mini SVG Preview ──────────────────────────────────────────────────────────
function MiniGraphPreview({ graph }: { graph: GraphData }) {
  const W = 52, H = 40;
  const xs = graph.nodes.map((n) => n.x ?? 0);
  const ys = graph.nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const pad = 5;
  const sx = (x: number) => pad + ((x - minX) / rangeX) * (W - pad * 2);
  const sy = (y: number) => pad + ((y - minY) / rangeY) * (H - pad * 2);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block flex-shrink-0" aria-hidden="true">
      {graph.edges.slice(0, 20).map((e) => {
        const src = nodeMap.get(e.sourceId), tgt = nodeMap.get(e.targetId);
        if (!src || !tgt) return null;
        return <line key={e.id} x1={sx(src.x ?? 0)} y1={sy(src.y ?? 0)}
          x2={sx(tgt.x ?? 0)} y2={sy(tgt.y ?? 0)} stroke="var(--color-edge-default)" strokeWidth={0.8} />;
      })}
      {graph.nodes.map((n) => (
        <circle key={n.id} cx={sx(n.x ?? 0)} cy={sy(n.y ?? 0)}
          r={Math.max(1.5, (n.size / 22) * 4)}
          fill={n.clusterColor ?? '#6B9FFF'} opacity={0.85} />
      ))}
    </svg>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ graph, isActive }: { graph: GraphData; isActive: boolean }) {
  const router = useRouter();

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <button
        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[10px] text-left transition-all"
        style={{
          background: isActive ? 'var(--accent-glow)' : 'transparent',
          border: isActive ? '1px solid rgba(107,88,192,0.20)' : '1px solid transparent',
        }}
        onClick={() => router.push(`/graph/${graph.id}`)}
        onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; } }}
        onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
      >
        {/* Mini preview */}
        <div
          className="flex-shrink-0 rounded-[6px] overflow-hidden"
          style={{ background: 'var(--bg-surface-2)', border: `1px solid var(--border-default)` }}
        >
          <MiniGraphPreview graph={graph} />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold truncate leading-snug" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {graph.name}
          </p>
          <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {graph.nodeCount} concepts
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {relativeTime(graph.updatedAt)}
          </p>
        </div>
        {isActive && (
          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />
        )}
      </button>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function SidebarProjectList() {
  const router = useRouter();
  const activeGraphId = useGraphStore((s) => s.graph?.id ?? null);
  const [graphs, setGraphs] = useState<GraphData[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setGraphs(listGraphs(session.userId));
  }, [activeGraphId]); // re-load when active graph changes (new graph created)

  return (
    <div className="pt-2">
      <p className="text-[9px] uppercase tracking-[0.1em] font-semibold px-2.5 mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        Recent graphs
      </p>

      {graphs.length === 0 ? (
        <button
          onClick={() => router.push('/welcome?step=2')}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-[10px] text-left transition-colors"
          style={{ background: 'var(--bg-surface-2)', border: '1px dashed var(--border-default)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
        >
          <Plus size={13} style={{ color: 'var(--text-muted)' }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Upload notes to start</p>
        </button>
      ) : (
        <div className="flex flex-col gap-0.5">
          {graphs.slice(0, 8).map((graph) => (
            <ProjectCard key={graph.id} graph={graph} isActive={graph.id === activeGraphId} />
          ))}
          {graphs.length > 8 && (
            <button
              onClick={() => router.push('/home')}
              className="text-[10px] text-center py-2 transition-colors"
              style={{ color: '#4A4A6A' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#8888AA'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#4A4A6A'; }}
            >
              +{graphs.length - 8} more → View all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
