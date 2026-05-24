/**
 * RightPanel — Notes & Edges
 *
 * Right panel now only shows EdgeDetailPanel when an edge is selected.
 * Node selection is handled by ConceptExpansion overlay in GraphCanvas.
 */

'use client';

import { useGraphStore } from '@/store/graph.store';
import { EdgeDetailPanel } from './EdgeDetailPanel';

export function RightPanel() {
  const { selectedEdgeId } = useGraphStore();

  if (selectedEdgeId) return <EdgeDetailPanel />;
  return null; // Node selection handled by ConceptExpansion overlay in GraphCanvas
}
