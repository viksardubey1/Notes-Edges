/**
 * buildTraversalOrder
 *
 * Returns a complete ordered list of every node ID for circular prev/next
 * navigation. Length always equals nodes.length.
 *
 * Strategy: cluster-first BFS.
 *   1. Sort clusters by their highest-centrality node (most important cluster first).
 *   2. Within each cluster, BFS from the highest-centrality unvisited node,
 *      following only same-cluster edges — so "next" stays local until the
 *      entire cluster is exhausted.
 *   3. Then move to the next cluster.
 *   4. Any disconnected stragglers are appended at the end.
 */
export function buildTraversalOrder(
  nodes: { id: string; centrality?: number; clusterId?: string }[],
  edges: { sourceId: string; targetId: string }[],
): string[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [nodes[0].id];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Undirected adjacency — deduplicated
  const adj = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]));
  for (const e of edges) {
    if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) continue;
    if (e.sourceId === e.targetId) continue;
    adj.get(e.sourceId)!.add(e.targetId);
    adj.get(e.targetId)!.add(e.sourceId);
  }

  // Group by cluster
  const clusterMap = new Map<string, { id: string; centrality?: number }[]>();
  for (const n of nodes) {
    const cid = n.clusterId ?? 'default';
    const list = clusterMap.get(cid) ?? [];
    list.push(n);
    clusterMap.set(cid, list);
  }

  // Sort clusters by their highest-centrality node (most important first)
  const sortedClusters = [...clusterMap.entries()].sort((a, b) => {
    const maxA = Math.max(...a[1].map((n) => n.centrality ?? 0));
    const maxB = Math.max(...b[1].map((n) => n.centrality ?? 0));
    return maxB - maxA;
  });

  const result: string[] = [];
  const visited = new Set<string>();

  for (const [, clusterNodes] of sortedClusters) {
    const clusterNodeIds = new Set(clusterNodes.map((n) => n.id));

    // BFS within this cluster only, starting from the highest-centrality unvisited node
    const byImportance = [...clusterNodes].sort(
      (a, b) => (b.centrality ?? 0) - (a.centrality ?? 0),
    );

    for (const startNode of byImportance) {
      if (visited.has(startNode.id)) continue;

      const queue: string[] = [startNode.id];
      visited.add(startNode.id);

      while (queue.length > 0) {
        const id = queue.shift()!;
        result.push(id);

        // Only follow edges to unvisited nodes in the same cluster
        const sameClusterNeighbors = [...(adj.get(id) ?? [])]
          .filter((nId) => !visited.has(nId) && clusterNodeIds.has(nId))
          .sort(
            (a, b) =>
              (nodeMap.get(b)?.centrality ?? 0) - (nodeMap.get(a)?.centrality ?? 0),
          );

        for (const nId of sameClusterNeighbors) {
          visited.add(nId);
          queue.push(nId);
        }
      }
    }
  }

  // Append any stragglers (isolated nodes with no cluster or edges)
  for (const n of nodes) {
    if (!visited.has(n.id)) result.push(n.id);
  }

  return result;
}
