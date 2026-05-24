/**
 * Graph Persistence — Notes & Edges
 *
 * Per-user graph storage in localStorage.
 * Key: ne_graphs_{userId} → GraphData[]
 *
 * Each graph is stored as a full GraphData object.
 * The list is sorted by updatedAt descending.
 */

import type { GraphData } from '@/types/graph';

const GRAPHS_KEY = (userId: string) => `ne_graphs_${userId}`;

function loadGraphList(userId: string): GraphData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GRAPHS_KEY(userId));
    return raw ? (JSON.parse(raw) as GraphData[]) : [];
  } catch {
    return [];
  }
}

function saveGraphList(userId: string, graphs: GraphData[]): void {
  try {
    localStorage.setItem(GRAPHS_KEY(userId), JSON.stringify(graphs));
  } catch {
    // Storage full — silently skip
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Save or update a graph in the user's collection. */
export function saveGraph(userId: string, graph: GraphData): void {
  const graphs = loadGraphList(userId);
  const idx = graphs.findIndex((g) => g.id === graph.id);
  const updated = { ...graph, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    graphs[idx] = updated;
  } else {
    graphs.unshift(updated);
  }
  saveGraphList(userId, graphs);
}

/** Load a specific graph by id from the user's collection. */
export function loadGraph(userId: string, graphId: string): GraphData | null {
  const graphs = loadGraphList(userId);
  return graphs.find((g) => g.id === graphId) ?? null;
}

/** List all graphs for a user, sorted by most recently updated. */
export function listGraphs(userId: string): GraphData[] {
  return loadGraphList(userId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Rename a graph. */
export function renameGraph(userId: string, graphId: string, name: string): void {
  const graphs = loadGraphList(userId);
  const graph = graphs.find((g) => g.id === graphId);
  if (graph) {
    graph.name = name.trim() || graph.name;
    graph.updatedAt = new Date().toISOString();
    saveGraphList(userId, graphs);
  }
}

/** Delete a graph from the user's collection. */
export function deleteGraph(userId: string, graphId: string): void {
  const graphs = loadGraphList(userId).filter((g) => g.id !== graphId);
  saveGraphList(userId, graphs);
}
