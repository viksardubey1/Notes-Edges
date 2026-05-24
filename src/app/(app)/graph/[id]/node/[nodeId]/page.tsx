/**
 * Node Detail Page — Notes & Edges
 * Route: /graph/:id/node/:nodeId
 *
 * Expanded single-node view rendered as a panel within the workspace.
 * When navigated to, opens the node detail panel and selects the node.
 *
 * Panel content hierarchy (per spec):
 * 1. Node title
 * 2. Source context
 * 3. AI concept summary
 * 4. Connected nodes list
 * 5. Raw source excerpt (collapsed)
 * 6. Actions
 *
 * Full implementation in panel phase.
 */

interface NodeDetailPageProps {
  params: Promise<{ id: string; nodeId: string }>;
}

export default async function NodeDetailPage({ params }: NodeDetailPageProps) {
  const { id, nodeId } = await params;

  // TODO: Fetch node data and trigger store.selectNode(nodeId)
  // This page renders inside the graph workspace layout

  return null;
}
