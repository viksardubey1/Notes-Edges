'use client';

/**
 * GraphStoreInitializer — hydrates the Zustand graph store on mount.
 *
 * Before calling setGraph it applies a label-aware collision expansion pass
 * so that nodes stored with old (cramped) coordinates are immediately spread
 * to a readable state on the client, without waiting for a server migration.
 *
 * Renders nothing visible.
 */

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import type { GraphData, GraphNode } from '@/types/graph';

// ── Label-aware comfort radius ────────────────────────────────────────────────

function estimateLabelWidth(label: string): number {
  const text = label.split(/\s+/).slice(0, 4).join(' ');
  return Math.min(text.length, 22) * 6.5 + 36;
}

function comfortRadius(node: GraphNode): number {
  const br = Math.max(14, node.size ?? 12);
  const halfLabel = estimateLabelWidth(node.label) / 2;
  return Math.max(br + 10, halfLabel, 54);
}

// ── Collision expansion ───────────────────────────────────────────────────────
// Pushes overlapping nodes apart until every pair's comfort circles have at
// least 14 px of clear air between them. Runs synchronously — fast enough
// for graphs up to ~200 nodes.

function applyExpansion(nodes: GraphNode[]): GraphNode[] {
  if (nodes.length < 2) return nodes;

  const pts = nodes.map((n) => ({
    id: n.id,
    x: n.x ?? 0,
    y: n.y ?? 0,
    cr: comfortRadius(n),
  }));

  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minSep = a.cr + b.cr + 8;
        if (dist < minSep) {
          const push = (minSep - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const posMap = new Map(pts.map((p) => [p.id, { x: Math.round(p.x), y: Math.round(p.y) }]));
  return nodes.map((n) => {
    const p = posMap.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

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

    const expandedNodes = applyExpansion(graph.nodes);
    setGraph({ ...graph, nodes: expandedNodes });
  }, [graph, setGraph]);

  return null;
}
