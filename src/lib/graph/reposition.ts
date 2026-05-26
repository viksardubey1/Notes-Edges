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
  const br = Math.max(14, node.size ?? 12);
  const halfLabel = estimateLabelWidth(node.label) / 2;
  return Math.max(br + 10, halfLabel, 54);
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

  // Outer ring: generous cluster separation so inter-cluster edges aren't crowded.
  // ~85 px per cluster is empirically comfortable at typical zoom levels.
  const outerRadius = Math.max(180, clusterIds.length * 65);
  const positions = new Map<string, { x: number; y: number }>();

  clusterIds.forEach((cid, ci) => {
    const clusterAngle = (2 * Math.PI * ci) / clusterIds.length - Math.PI / 2;
    const cx = outerRadius * Math.cos(clusterAngle);
    const cy = outerRadius * Math.sin(clusterAngle);
    const members = clusters.get(cid)!;

    // Highest-centrality node sits at the cluster centroid
    const sorted = [...members].sort((a, b) => (b.centrality ?? 0) - (a.centrality ?? 0));

    // Inner ring: sized so adjacent arc spacing ≈ 145 px regardless of cluster size.
    // Formula: arc = 2 * r * sin(π / n) → r = 145 / (2 * sin(π / n)) ≈ n * 24 px.
    const innerRadius = Math.max(60, sorted.length * 18);

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

  // ── Label-aware collision resolution ─────────────────────────────────────
  // Each pair gets a *dynamic* minSep = cr_i + cr_j + 14 so that both label
  // bounding boxes have a clear 14 px gap between them.
  const crMap = new Map(nodes.map((n) => [n.id, comfortRadius(n)]));
  const pts = [...positions.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));

  for (let iter = 0; iter < 150; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minSep = (crMap.get(pts[i].id) ?? 54) + (crMap.get(pts[j].id) ?? 54) + 8;
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
