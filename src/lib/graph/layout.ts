/**
 * Graph Layout Engine — Notes & Edges
 *
 * Orchestrates community detection → centroid pre-positioning → D3-force layout.
 * This file is the bridge between raw graph data and positioned nodes.
 *
 * Architecture note:
 * - For graphs > 200 nodes, this runs in a Web Worker (see graph.worker.ts).
 * - The layout result (positioned nodes) is sent back to the main thread.
 * - Main thread only receives final positions — never runs simulation directly.
 */

import type { GraphNode, GraphEdge, GraphCluster, ForceLayoutConfig } from '@/types/graph';
import { getClusterCentroidPositions, computeCentrality, computeNodeRadius } from './physics';
import { semantic } from '@/lib/tokens';

// ─── Cluster Colors ────────────────────────────────────────────────────────────

const CLUSTER_COLORS = semantic.color.cluster;

// ─── Community Detection (Louvain-inspired greedy) ───────────────────────────

/**
 * Simple greedy community detection for client-side use.
 * For production, this should be replaced with a proper Louvain implementation
 * or offloaded to the backend (Neo4j has native community detection).
 *
 * Returns a map of nodeId → clusterId.
 */
export function detectCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, string> {
  const clusterMap = new Map<string, string>();

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
  }

  // BFS-based connected component detection as initial clusters
  const visited = new Set<string>();
  let clusterId = 0;

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const queue = [node.id];
    const component: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);

      const neighbors = adjacency.get(current) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    // Assign cluster ID to all nodes in component
    const cId = `cluster-${clusterId++}`;
    for (const nodeId of component) {
      clusterMap.set(nodeId, cId);
    }
  }

  return clusterMap;
}

// ─── Centrality Computation ───────────────────────────────────────────────────

/**
 * Compute degree centrality for all nodes.
 * Returns a map of nodeId → normalized centrality (0–1).
 */
export function computeDegreeCentrality(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, number> {
  const degreeCounts = new Map<string, number>();
  for (const node of nodes) degreeCounts.set(node.id, 0);

  for (const edge of edges) {
    degreeCounts.set(edge.sourceId, (degreeCounts.get(edge.sourceId) ?? 0) + 1);
    degreeCounts.set(edge.targetId, (degreeCounts.get(edge.targetId) ?? 0) + 1);
  }

  const maxDegree = Math.max(...degreeCounts.values(), 1);

  const centralityMap = new Map<string, number>();
  for (const [nodeId, degree] of degreeCounts) {
    centralityMap.set(nodeId, degree / maxDegree);
  }

  return centralityMap;
}

// ─── Node Enrichment ──────────────────────────────────────────────────────────

/**
 * Enrich nodes with computed centrality, radius, and cluster assignments.
 * This is called once after receiving raw graph data from the API.
 */
export function enrichNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { enrichedNodes: GraphNode[]; clusters: GraphCluster[] } {
  const centralityMap = computeDegreeCentrality(nodes, edges);
  const clusterMap = detectCommunities(nodes, edges);

  // Map cluster IDs to colors
  const clusterIds = [...new Set(clusterMap.values())];
  const clusterColorMap = new Map<string, string>();
  clusterIds.forEach((cId, i) => {
    clusterColorMap.set(cId, CLUSTER_COLORS[i % CLUSTER_COLORS.length]);
  });

  const enrichedNodes: GraphNode[] = nodes.map((node) => {
    const centrality = centralityMap.get(node.id) ?? 0;
    const clusterId = clusterMap.get(node.id);
    return {
      ...node,
      centrality,
      size: computeNodeRadius(centrality),
      clusterId,
      clusterColor: clusterId ? clusterColorMap.get(clusterId) : undefined,
    };
  });

  // Build cluster objects
  const clusterNodeMap = new Map<string, GraphNode[]>();
  for (const node of enrichedNodes) {
    if (!node.clusterId) continue;
    const arr = clusterNodeMap.get(node.clusterId) ?? [];
    arr.push(node);
    clusterNodeMap.set(node.clusterId, arr);
  }

  const clusters: GraphCluster[] = [];
  let colorIndex = 0;
  for (const [cId, clusterNodes] of clusterNodeMap) {
    // Use top centrality node label as cluster label
    const topNode = clusterNodes.sort((a, b) => b.centrality - a.centrality)[0];
    const centroid = {
      x: clusterNodes.reduce((s, n) => s + (n.x ?? 0), 0) / clusterNodes.length,
      y: clusterNodes.reduce((s, n) => s + (n.y ?? 0), 0) / clusterNodes.length,
    };
    clusters.push({
      id: cId,
      label: topNode?.label ?? 'Cluster',
      color: CLUSTER_COLORS[colorIndex++ % CLUSTER_COLORS.length],
      nodeIds: clusterNodes.map((n) => n.id),
      centroid,
    });
  }

  return { enrichedNodes, clusters };
}

// ─── Orphan Node Handling ─────────────────────────────────────────────────────

/**
 * Identify orphan nodes (zero connections) and assign them to
 * the bottom-left orphan cluster region.
 */
export function identifyOrphans(nodes: GraphNode[], edges: GraphEdge[]): Set<string> {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.sourceId);
    connectedIds.add(edge.targetId);
  }

  const orphanIds = new Set<string>();
  for (const node of nodes) {
    if (!connectedIds.has(node.id)) {
      orphanIds.add(node.id);
    }
  }

  return orphanIds;
}

/**
 * Compute initial positions for orphan nodes in the bottom-left region.
 */
export function positionOrphans(
  orphanIds: Set<string>,
  canvasWidth: number,
  canvasHeight: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const orphanArray = [...orphanIds];
  const cols = Math.ceil(Math.sqrt(orphanArray.length));
  const cellSize = 40;
  const startX = 40;
  const startY = canvasHeight - (Math.ceil(orphanArray.length / cols) * cellSize) - 40;

  orphanArray.forEach((id, i) => {
    positions.set(id, {
      x: startX + (i % cols) * cellSize,
      y: startY + Math.floor(i / cols) * cellSize,
    });
  });

  return positions;
}

// ─── Centrality-Based Node Sorting ───────────────────────────────────────────

/**
 * Sort nodes by centrality descending (highest first).
 * Used for LOD filtering and Tab key navigation order.
 */
export function sortNodesByCentrality(nodes: GraphNode[]): GraphNode[] {
  return [...nodes].sort((a, b) => b.centrality - a.centrality);
}

/**
 * Get the top N% of nodes by centrality.
 */
export function getTopNodesByPercent(nodes: GraphNode[], percent: number): Set<string> {
  const sorted = sortNodesByCentrality(nodes);
  const count = Math.max(1, Math.ceil(sorted.length * percent));
  return new Set(sorted.slice(0, count).map((n) => n.id));
}
