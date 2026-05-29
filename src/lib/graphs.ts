/**
 * Graph Persistence — Notes & Edges
 *
 * Supabase-backed graph storage. All functions are async.
 * The full GraphData payload is stored in the `data` jsonb column.
 * Separate columns (name, node_count, edge_count) allow fast list queries.
 */

import { supabase } from '@/lib/supabase';
import type { GraphData } from '@/types/graph';

// ── Row shape returned by Supabase for list queries ───────────────────────────

interface GraphRow {
  id: string;
  user_id: string;
  name: string;
  node_count: number;
  edge_count: number;
  updated_at: string;
  created_at: string;
  data: GraphData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToGraphData(row: GraphRow): GraphData {
  // Merge top-level metadata with the stored data blob
  return {
    ...row.data,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    nodeCount: row.node_count,
    edgeCount: row.edge_count,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Save or update a graph. userId is kept for API compatibility but RLS handles auth. */
export async function saveGraph(userId: string, graph: GraphData): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('graphs')
    .upsert({
      id: graph.id,
      user_id: userId,
      name: graph.name,
      node_count: graph.nodeCount ?? graph.nodes?.length ?? 0,
      edge_count: graph.edgeCount ?? graph.edges?.length ?? 0,
      data: graph,
      updated_at: now,
    });

  if (error) console.error('[graphs] saveGraph error:', error.message);
}

/** Load a single graph by id. */
export async function loadGraph(_userId: string, graphId: string): Promise<GraphData | null> {
  const { data, error } = await supabase
    .from('graphs')
    .select('*')
    .eq('id', graphId)
    .single();

  if (error || !data) return null;
  return rowToGraphData(data as GraphRow);
}

/** List all graphs for the current user, most recently updated first. */
export async function listGraphs(_userId: string): Promise<GraphData[]> {
  const { data, error } = await supabase
    .from('graphs')
    .select('id, name, node_count, edge_count, updated_at, created_at, data')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return (data as GraphRow[]).map(rowToGraphData);
}

/** Rename a graph. */
export async function renameGraph(_userId: string, graphId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('graphs')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', graphId);

  if (error) console.error('[graphs] renameGraph error:', error.message);
}

/** Delete a graph. */
export async function deleteGraph(_userId: string, graphId: string): Promise<void> {
  const { error } = await supabase
    .from('graphs')
    .delete()
    .eq('id', graphId);

  if (error) console.error('[graphs] deleteGraph error:', error.message);
}

/** Clone a graph (already loaded) into the current user's account. */
export async function cloneGraph(userId: string, source: GraphData): Promise<GraphData | null> {
  const now = new Date().toISOString();
  const newId = `graph-${Date.now()}`;
  const clone: GraphData = {
    ...source,
    id: newId,
    userId,
    name: `${source.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveGraph(userId, clone);
    return clone;
  } catch (err) {
    console.error('[graphs] cloneGraph error:', err);
    return null;
  }
}
