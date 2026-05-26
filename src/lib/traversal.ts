/**
 * buildTraversalOrder
 *
 * Returns a complete ordered list of every node ID for circular prev/next
 * navigation. Length always equals nodes.length.
 *
 * Strategy: undirected BFS, starting from the highest-centrality node.
 * Edges are treated as bidirectional so every node is reachable regardless
 * of edge direction. Disconnected components are handled by restarting BFS
 * from the next unvisited high-centrality node.
 */
export function buildTraversalOrder(
  nodes: { id: string; centrality?: number }[],
  edges: { sourceId: string; targetId: string }[],
): string[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [nodes[0].id];

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Undirected adjacency — deduplicated with a Set per node
  const adj = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]));
  for (const e of edges) {
    if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) continue;
    if (e.sourceId === e.targetId) continue;
    adj.get(e.sourceId)!.add(e.targetId);
    adj.get(e.targetId)!.add(e.sourceId);
  }

  // Sorted highest centrality first — BFS explores important nodes early
  const byImportance = [...nodes].sort(
    (a, b) => (b.centrality ?? 0) - (a.centrality ?? 0),
  );

  const result: string[] = [];
  const visited = new Set<string>();

  for (const startNode of byImportance) {
    if (visited.has(startNode.id)) continue;

    // BFS from this unvisited node (new connected component)
    const queue: string[] = [startNode.id];
    visited.add(startNode.id);

    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);

      // Enqueue unvisited neighbors, highest centrality first
      const neighbors = [...(adj.get(id) ?? [])]
        .filter((nId) => !visited.has(nId))
        .sort((a, b) => {
          const na = nodes.find((n) => n.id === a);
          const nb = nodes.find((n) => n.id === b);
          return (nb?.centrality ?? 0) - (na?.centrality ?? 0);
        });

      for (const nId of neighbors) {
        visited.add(nId);
        queue.push(nId);
      }
    }
  }

  return result;
}
