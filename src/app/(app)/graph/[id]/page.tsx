/**
 * Graph Workspace Page — Notes & Edges
 * Route: /graph/:id
 *
 * Checks localStorage for a user-generated graph matching the id.
 * Falls back to DEMO_GRAPH so the demo route always works.
 */

import { LocalGraphLoader } from '@/components/graph/LocalGraphLoader';
import { DEMO_GRAPH } from '@/lib/graph/demo-data';

interface GraphWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function GraphWorkspacePage({ params }: GraphWorkspacePageProps) {
  const { id } = await params;

  // LocalGraphLoader checks localStorage for `ne_graph_<id>` on the client.
  // We pass DEMO_GRAPH (with the current id) as the fallback so demo-1 still works.
  const fallback = { ...DEMO_GRAPH, id };

  return <LocalGraphLoader graphId={id} fallback={fallback} />;
}
