'use client';

/**
 * GraphStoreInitializer — hydrates the Zustand graph store on mount.
 *
 * Renders nothing visible. Used as a sibling to GraphCanvas inside the
 * graph workspace layout so the store is populated before the canvas paints.
 */

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import type { GraphData } from '@/types/graph';

interface GraphStoreInitializerProps {
  graph: GraphData;
}

export function GraphStoreInitializer({ graph }: GraphStoreInitializerProps) {
  const setGraph = useGraphStore((s) => s.setGraph);

  useEffect(() => {
    setGraph(graph);
  }, [graph, setGraph]);

  return null;
}
