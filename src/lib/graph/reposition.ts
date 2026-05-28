/**
 * repositionNodes — Notes & Edges
 *
 * Re-runs the cluster-ring layout + label-aware collision resolution on an
 * existing array of GraphNodes. Used both by the extract-graph API route and
 * the migration endpoint that updates stored graphs.
 *
 * Nodes already carry clusterId and centrality — no re-detection needed.
 */

import type { GraphNode } from '@/types/graph';

// ── Label-aware comfort radius ────────────────────────────────────────────────
// Each node needs a clear zone that covers both its circle AND its label text.

function estimateLabelWidth(label: string): number {
  const text = label.split(/\s+/).slice(0, 4).join(' ');
  return Math.min(text.length, 22) * 6.5 + 36; // 36 = 18 px padding each side
}

function comfortRadius(node: GraphNode): number {
  const br = Math.max(18, node.size ?? 14);
  const halfLabel = estimateLabelWidth(node.label) / 2;
  return Math.max(br + 12, halfLabel, 56);
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function repositionNodes(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  // Group by cluster
  const clusters = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const cid = n.clusterId ?? 'cluster-default';
    const list = clusters.get(cid) ?? [];
    list.push(n);
    clusters.set(cid, list);
  }
  const clusterIds = [...clusters.keys()];

  // Outer ring: generous cluster separation
  const outerRadius = Math.max(210, clusterIds.length * 72);
  const positions = new Map<string, { x: number; y: number }>();
  const nodeById = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));

  clusterIds.forEach((cid, ci) => {
    const clusterAngle = (2 * Math.PI * ci) / clusterIds.length - Math.PI / 2;
    const cx = outerRadius * Math.cos(clusterAngle);
    const cy = outerRadius * Math.sin(clusterAngle);
    const members = clusters.get(cid)!;

    // Highest-centrality node sits at the cluster centroid
    const sorted = [...members].sort((a, b) => (b.centrality ?? 0) - (a.centrality ?? 0));

    // Inner ring: wide enough so nodes start with meaningful separation
    const innerRadius = Math.max(70, sorted.length * 22);

    sorted.forEach((n, ni) => {
      if (ni === 0) {
        positions.set(n.id, { x: Math.round(cx), y: Math.round(cy) });
        return;
      }
      const angle = (2 * Math.PI * ni) / sorted.length - Math.PI / 2;
      positions.set(n.id, {
        x: Math.round(cx + innerRadius * Math.cos(angle)),
        y: Math.round(cy + innerRadius * Math.sin(angle)),
      });
    });
  });

  // Label-aware collision resolution — push nodes apart until labels don't overlap.
  // minSep = sum of comfort radii + 24px breathing gap between label edges.
  const LABEL_GAP = 14;
  const pts = [...positions.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));

  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const ni = nodeById.get(pts[i].id);
        const nj = nodeById.get(pts[j].id);
        const minSep = (ni ? comfortRadius(ni) : 56) + (nj ? comfortRadius(nj) : 56) + LABEL_GAP;
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (dist < minSep) {
          const push = (minSep - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          pts[i].x -= ux * push;
          pts[i].y -= uy * push;
          pts[j].x += ux * push;
          pts[j].y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  for (const pt of pts) {
    positions.set(pt.id, { x: Math.round(pt.x), y: Math.round(pt.y) });
  }

  return positions;
}
