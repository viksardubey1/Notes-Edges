/**
 * SidebarProjectList — Notes & Edges
 *
 * Compact list of recent graphs. Skeleton while loading, then rows.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graph.store';
import { useAuth } from '@/context/AuthContext';
import { listGraphs } from '@/lib/graphs';
import { useStableLoading } from '@/hooks/useStableLoading';
import type { GraphData } from '@/types/graph';

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function GraphRow({ graph, isActive }: { graph: GraphData; isActive: boolean }) {
  const router = useRouter();

  return (
    <button
      className="w-full flex items-start gap-2 px-2.5 py-2 rounded-[8px] text-left transition-colors"
      style={{ background: isActive ? 'var(--accent-glow)' : 'transparent' }}
      onClick={() => router.push(`/graph/${graph.id}`)}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <div
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]"
        style={{ background: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', opacity: isActive ? 1 : 0.35 }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] truncate leading-snug"
          style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 500 : 400 }}
        >
          {graph.name}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {graph.nodeCount} nodes · {relativeTime(graph.updatedAt)}
        </p>
      </div>
    </button>
  );
}

function SkeletonRow({ delay }: { delay: string }) {
  return (
    <div className="flex items-start gap-2 px-2.5 py-2">
      <div className="w-1.5 h-1.5 rounded-full mt-[5px] bg-[#EEEAF8] animate-[shimmer-opacity_2.4s_ease-in-out_infinite]" style={{ animationDelay: delay }} />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 rounded-full bg-[#EEEAF8] animate-[shimmer-opacity_2.4s_ease-in-out_infinite]" style={{ width: `${60 + Math.random() * 30}%`, animationDelay: delay }} />
        <div className="h-2 w-16 rounded-full bg-[#EEEAF8] animate-[shimmer-opacity_2.4s_ease-in-out_infinite] opacity-60" style={{ animationDelay: delay }} />
      </div>
    </div>
  );
}

export function SidebarProjectList() {
  const router = useRouter();
  const activeGraphId = useGraphStore((s) => s.graph?.id ?? null);
  const { session } = useAuth();
  const [graphs, setGraphs] = useState<GraphData[] | null>(null);
  const isLoading = graphs === null && !!session;
  const { showSkeleton, phase: loadPhase } = useStableLoading(isLoading, { delay: 150, minDuration: 400 });

  useEffect(() => {
    if (!session) return;
    listGraphs(session.userId).then(setGraphs);
  }, [session, activeGraphId]);

  // Loading — show skeleton
  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-0.5" style={{ opacity: loadPhase === 'fading' ? 0 : 1, transition: 'opacity 250ms ease-out' }}>
        <span className="px-2.5 pt-1 pb-0.5 text-[10px] uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-muted)' }}>
          Recents
        </span>
        <SkeletonRow delay="0s" />
        <SkeletonRow delay="0.12s" />
        <SkeletonRow delay="0.24s" />
      </div>
    );
  }

  // Empty — no graphs yet
  if (!graphs || graphs.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pt-1 pb-0.5 text-[10px] uppercase tracking-[0.08em]"
        style={{ color: 'var(--text-muted)' }}>
        Recents
      </span>
      {graphs.slice(0, 6).map((graph) => (
        <GraphRow key={graph.id} graph={graph} isActive={graph.id === activeGraphId} />
      ))}
      {graphs.length > 6 && (
        <button
          onClick={() => router.push('/home')}
          className="px-2.5 py-1 text-[11px] text-left transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          +{graphs.length - 6} more
        </button>
      )}
    </div>
  );
}
