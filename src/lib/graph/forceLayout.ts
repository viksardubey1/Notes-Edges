/**
 * Force-directed layout — Notes & Edges
 *
 * Produces node positions using:
 *   - Coulomb repulsion between all pairs
 *   - Hooke spring attraction along edges
 *   - Weak cluster gravity (soft same-cluster cohesion)
 *   - Center gravity (prevents drift)
 *   - Label-aware comfort radius so labels never overlap
 *   - Post-simulation hard collision resolution
 *
 * Runs synchronously (no D3 / rAF). Called once on graph load in
 * GraphStoreInitializer before the graph is written to the Zustand store.
 */

import type { GraphNode, GraphEdge } from '@/types/graph';

// ── Tuning constants ──────────────────────────────────────────────────────────

const ITERATIONS     = 300;
const INITIAL_TEMP   = 35;
const COOLING        = 0.983;    // temp decays to ≈0.5 in ~255 iters
const MIN_TEMP       = 0.5;

const K_REPULSION    = 22_000;   // Coulomb constant
const LINK_PADDING   = 28;       // extra gap beyond combined comfort radii on edges
const CLUSTER_G      = 0.010;    // cluster gravity strength
const CENTER_G       = 0.003;    // center gravity strength
const DAMPING        = 0.70;     // velocity damping per step

const COLLISION_ITERS = 60;      // hard collision resolution passes after sim

const LABEL_PX_PER_CHAR = 6.2;
const LABEL_SIDE_PAD    = 18;    // horizontal padding on each side of label text

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimateLabelWidth(label: string): number {
  // Approximate rendered width of the first 4 words
  const text = label.split(/\s+/).slice(0, 4).join(' ');
  return text.length * LABEL_PX_PER_CHAR + LABEL_SIDE_PAD * 2;
}

function bodyRadius(node: GraphNode): number {
  return Math.max(14, node.size ?? 12);
}

/**
 * Effective comfort radius: the clear zone that must surround each node so
 * that neither node circles nor their labels ever visually collide.
 */
function comfortRadius(node: GraphNode): number {
  const br   = bodyRadius(node);
  const half = estimateLabelWidth(node.label) / 2;
  return Math.max(br + 12, half, 52);
}

// ── Type ──────────────────────────────────────────────────────────────────────

export interface PositionResult {
  id: string;
  x: number;
  y: number;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): PositionResult[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ id: nodes[0].id, x: 0, y: 0 }];

  // ── Cluster metadata ───────────────────────────────────────────────────────
  const clusterMembers = new Map<string, string[]>();
  for (const n of nodes) {
    const cid = n.clusterId ?? 'default';
    const arr = clusterMembers.get(cid) ?? [];
    arr.push(n.id);
    clusterMembers.set(cid, arr);
  }
  const clusterIds = [...clusterMembers.keys()];

  // Cluster centroids placed on a ring scaled to give nodes generous territory
  const outerR = Math.max(500, Math.min(1500, 170 * Math.sqrt(nodes.length)));
  const clusterCentroid = new Map<string, { x: number; y: number }>();
  clusterIds.forEach((cid, i) => {
    const angle = (2 * Math.PI * i) / clusterIds.length - Math.PI / 2;
    clusterCentroid.set(cid, {
      x: outerR * Math.cos(angle),
      y: outerR * Math.sin(angle),
    });
  });

  // ── Seed positions ─────────────────────────────────────────────────────────
  // Use existing x/y if present (preserves manually stored layout); otherwise
  // place on an inner ring around the cluster centroid.
  const pos = new Map<string, { x: number; y: number }>();
  const vel = new Map<string, { x: number; y: number }>();

  for (const n of nodes) {
    const hasPos = n.x != null && n.y != null && (Math.abs(n.x) + Math.abs(n.y) > 0);
    if (hasPos) {
      pos.set(n.id, { x: n.x!, y: n.y! });
    } else {
      const cid     = n.clusterId ?? 'default';
      const centroid = clusterCentroid.get(cid)!;
      const members  = clusterMembers.get(cid)!;
      const idx      = members.indexOf(n.id);
      const innerR   = Math.max(100, members.length * 55);
      const angle    = (2 * Math.PI * idx) / members.length - Math.PI / 2;
      pos.set(n.id, {
        x: centroid.x + innerR * Math.cos(angle),
        y: centroid.y + innerR * Math.sin(angle),
      });
    }
    vel.set(n.id, { x: 0, y: 0 });
  }

  // Precompute comfort radii
  const crMap = new Map<string, number>();
  for (const n of nodes) crMap.set(n.id, comfortRadius(n));

  // Edge list with weights
  const edgeList = edges.map((e) => ({
    a: e.sourceId,
    b: e.targetId,
    weight: Math.min(e.weight ?? 1, 1),
  }));

  // ── Simulation ─────────────────────────────────────────────────────────────
  let temp = INITIAL_TEMP;

  for (let iter = 0; iter < ITERATIONS && temp > MIN_TEMP; iter++) {
    // Accumulate forces
    const fx = new Map<string, number>();
    const fy = new Map<string, number>();
    for (const n of nodes) { fx.set(n.id, 0); fy.set(n.id, 0); }

    // Coulomb repulsion — O(n²)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ai = nodes[i].id, bi = nodes[j].id;
        const pa = pos.get(ai)!, pb = pos.get(bi)!;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const d2 = dx * dx + dy * dy + 400; // +400 prevents singularity
        const d  = Math.sqrt(d2);
        const f  = K_REPULSION / d2;
        const ux = dx / d, uy = dy / d;
        fx.set(ai, fx.get(ai)! - ux * f);
        fy.set(ai, fy.get(ai)! - uy * f);
        fx.set(bi, fx.get(bi)! + ux * f);
        fy.set(bi, fy.get(bi)! + uy * f);
      }
    }

    // Hooke spring attraction along edges
    for (const e of edgeList) {
      const pa = pos.get(e.a), pb = pos.get(e.b);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const cra = crMap.get(e.a) ?? 52;
      const crb = crMap.get(e.b) ?? 52;
      // Loosely-connected edges get more slack so weakly-related nodes sit further apart
      const restLen = cra + crb + LINK_PADDING + (1 - e.weight) * 60;
      const spring  = (d - restLen) * 0.04;
      const ux = dx / d, uy = dy / d;
      fx.set(e.a, fx.get(e.a)! + ux * spring);
      fy.set(e.a, fy.get(e.a)! + uy * spring);
      fx.set(e.b, fx.get(e.b)! - ux * spring);
      fy.set(e.b, fy.get(e.b)! - uy * spring);
    }

    // Cluster gravity — gentle pull toward cluster centroid
    for (const n of nodes) {
      const cid      = n.clusterId ?? 'default';
      const centroid = clusterCentroid.get(cid);
      if (!centroid) continue;
      const p = pos.get(n.id)!;
      fx.set(n.id, fx.get(n.id)! + (centroid.x - p.x) * CLUSTER_G);
      fy.set(n.id, fy.get(n.id)! + (centroid.y - p.y) * CLUSTER_G);
    }

    // Center gravity — prevent graph from drifting off-screen
    for (const n of nodes) {
      const p = pos.get(n.id)!;
      fx.set(n.id, fx.get(n.id)! - p.x * CENTER_G);
      fy.set(n.id, fy.get(n.id)! - p.y * CENTER_G);
    }

    // Integrate — velocity Verlet-style with damping and temperature clamping
    for (const n of nodes) {
      const p  = pos.get(n.id)!;
      const v  = vel.get(n.id)!;
      const gx = fx.get(n.id)!;
      const gy = fy.get(n.id)!;

      v.x = (v.x + gx) * DAMPING;
      v.y = (v.y + gy) * DAMPING;

      const speed = Math.sqrt(v.x * v.x + v.y * v.y) || 0.01;
      const clamped = Math.min(speed, temp);
      const s = clamped / speed;

      p.x += v.x * s;
      p.y += v.y * s;
    }

    temp *= COOLING;
  }

  // ── Hard collision resolution ──────────────────────────────────────────────
  // After the simulation cools, do a strict push-apart pass so no two comfort
  // circles ever overlap, regardless of what the simulation left behind.
  const pts = nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { id: n.id, x: p.x, y: p.y, cr: crMap.get(n.id) ?? 52 };
  });

  for (let iter = 0; iter < COLLISION_ITERS; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minD = a.cr + b.cr + 8; // 8px buffer between comfort circles
        if (dist < minD) {
          const push = (minD - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
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

  return pts.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y) }));
}
