'use client';

/**
 * GraphStoreInitializer — hydrates the Zustand graph store on mount.
 *
 * Re-runs the ring layout on the client every time a graph is opened so that
 * spacing parameter changes in reposition.ts take effect immediately without
 * needing a server-side migration.
 *
 * Renders nothing visible.
 */

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { repositionNodes } from '@/lib/graph/reposition';
import type { GraphData } from '@/types/graph';

interface GraphStoreInitializerProps {
  graph: GraphData;
}

export function GraphStoreInitializer({ graph }: GraphStoreInitializerProps) {
  const setGraph = useGraphStore((s) => s.setGraph);

  useEffect(() => {
    if (!graph.nodes.length) {
      setGraph(graph);
      return;
    }

    // Re-run ring layout with current parameters so position changes are
    // visible without waiting for the server migration to run.
    const newPositions = repositionNodes(graph.nodes);
    const repositionedGraph: GraphData = {
      ...graph,
      nodes: graph.nodes.map((n) => {
        const pos = newPositions.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      }),
    };

    setGraph(repositionedGraph);
  }, [graph.id, setGraph]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
