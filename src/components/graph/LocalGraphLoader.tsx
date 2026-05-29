'use client';

/**
 * LocalGraphLoader — Notes & Edges
 *
 * Loads a graph into the Zustand store on mount.
 * Primary source: Supabase (via loadGraph).
 * Fallback: provided fallback GraphData prop.
 */

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { useAuth } from '@/context/AuthContext';
import { loadGraph } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';

interface LocalGraphLoaderProps {
  graphId: string;
  fallback: GraphData;
}

export function LocalGraphLoader({ graphId, fallback }: LocalGraphLoaderProps) {
  const setGraph = useGraphStore((s) => s.setGraph);
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (session) {
      loadGraph(session.userId, graphId).then((graph) => {
        if (graph) { setGraph(graph); return; }
        // Fall back to public API if RLS blocked it
        fetch(`/api/graphs/${graphId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => setGraph(data?.graph ?? fallback));
      });
    } else {
      // Not logged in — fetch via public API
      fetch(`/api/graphs/${graphId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => setGraph(data?.graph ?? fallback));
    }
  }, [graphId, fallback, session, loading, setGraph]);

  return null;
}

/**
 * saveGraphLocally — kept as a no-op shim so existing call sites compile
 * without changes. All persistence now goes through Supabase via saveGraph().
 */
export function saveGraphLocally(_graph: GraphData): void {
  // no-op: Supabase is the persistence layer now
}
