/**
 * LocalGraphLoader — Notes & Edges
 *
 * Client component that loads a graph into the Zustand store.
 *
 * Load priority:
 * 1. User's graph collection: ne_graphs_{userId} (array lookup by id)
 * 2. Legacy key: ne_graph_{id} (old format, kept for backwards compatibility)
 * 3. Provided fallback (demo graph)
 */

'use client';

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { getSession } from '@/lib/auth';
import { loadGraph } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';

interface LocalGraphLoaderProps {
  graphId: string;
  fallback: GraphData;
}

const LEGACY_KEY = (id: string) => `ne_graph_${id}`;

export function LocalGraphLoader({ graphId, fallback }: LocalGraphLoaderProps) {
  const setGraph = useGraphStore((s) => s.setGraph);

  useEffect(() => {
    let graph: GraphData = fallback;

    // 1. Try user's collection
    const session = getSession();
    if (session) {
      const userGraph = loadGraph(session.userId, graphId);
      if (userGraph) {
        setGraph(userGraph);
        return;
      }
    }

    // 2. Try legacy localStorage key
    try {
      const stored = localStorage.getItem(LEGACY_KEY(graphId));
      if (stored) {
        const parsed = JSON.parse(stored) as GraphData;
        if (parsed?.id && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          graph = parsed;
        }
      }
    } catch {
      // Malformed storage — use fallback
    }

    setGraph(graph);
  }, [graphId, fallback, setGraph]);

  return null;
}

/** Save a generated graph to the legacy localStorage key (used by LocalGraphLoader as fallback). */
export function saveGraphLocally(graph: GraphData): void {
  try {
    localStorage.setItem(LEGACY_KEY(graph.id), JSON.stringify(graph));
  } catch {
    // Storage full or unavailable
  }
}
