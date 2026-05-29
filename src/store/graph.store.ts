/**
 * Graph Store — Notes & Edges
 *
 * Single source of truth for all graph data and interaction state.
 * Graph data is NEVER mutated directly — all updates go through Zustand actions.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  GraphState, GraphData, GraphNode, GraphEdge, GraphCluster,
  GraphMode, LearningState,
} from '@/types/graph';

// Immer requires this plugin to mutate Set/Map inside drafts
enableMapSet();

// ── Backdrop persistence ───────────────────────────────────────────────────────

const BACKDROP_KEY_PREFIX = 'ne_backdrop_';

function loadBackdrop(graphId: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(BACKDROP_KEY_PREFIX + graphId); } catch { return null; }
}

function persistBackdrop(graphId: string, url: string | null): void {
  try {
    if (url) localStorage.setItem(BACKDROP_KEY_PREFIX + graphId, url);
    else localStorage.removeItem(BACKDROP_KEY_PREFIX + graphId);
  } catch { /* quota exceeded */ }
}

// ── Visited node persistence ───────────────────────────────────────────────────

const VISITED_NODES_KEY = 'ne_visited_nodes';

function loadVisitedNodes(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(VISITED_NODES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistVisitedNodes(visited: Set<string>): void {
  try {
    localStorage.setItem(VISITED_NODES_KEY, JSON.stringify([...visited]));
  } catch {
    // quota exceeded or unavailable
  }
}

// ── Learning state persistence ─────────────────────────────────────────────────

const LEARNING_STATES_KEY = 'ne_learning_states';

function loadLearningStates(): Record<string, LearningState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LEARNING_STATES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LearningState>) : {};
  } catch {
    return {};
  }
}

function persistLearningStates(states: Record<string, LearningState>): void {
  try {
    localStorage.setItem(LEARNING_STATES_KEY, JSON.stringify(states));
  } catch {
    // quota exceeded or unavailable
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>()(
  immer((set, get) => ({
    // ─── Data ────────────────────────────────────────────────────────────────
    graph: null,
    clusters: [],
    sources: [],

    // ─── Selection ──────────────────────────────────────────────────────────
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null,
    multiSelectedNodeIds: new Set(),

    // ─── Interaction mode ────────────────────────────────────────────────────
    mode: 'default',

    // ─── Viewport ────────────────────────────────────────────────────────────
    zoom: 1.6,
    pan: { x: 0, y: 0 },

    // ─── Filters ─────────────────────────────────────────────────────────────
    searchQuery: '',
    filteredNodeIds: null,

    // ─── UI flags ────────────────────────────────────────────────────────────
    isGenerating: false,
    isClusterModeActive: false,

    // ─── Learning states (persisted) ─────────────────────────────────────────
    learningStates: loadLearningStates(),

    // ─── Backdrop image ───────────────────────────────────────────────────────
    backdropUrl: null as string | null,

    // ─── Visit history ────────────────────────────────────────────────────────
    visitedNodeIds: loadVisitedNodes(),
    navigationHistory: [] as string[],

    // ─── Actions ─────────────────────────────────────────────────────────────

    setGraph: (graph: GraphData) =>
      set((state) => {
        // Spread normalization: only fires for truly degenerate inputs (all
        // nodes piled at the same point, or absurdly large positions from bad
        // data). Normal ring-layout + collision-resolution positions are left
        // untouched (90 % tolerance means it only fires if span is off by > 90%).
        const xs = graph.nodes.map((n) => n.x ?? 0);
        const ys = graph.nodes.map((n) => n.y ?? 0);
        if (graph.nodes.length > 2) {
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const span = Math.max(maxX - minX, maxY - minY);
          const target = Math.max(900, Math.min(1800, 160 * Math.sqrt(graph.nodes.length)));
          if (span > 0 && Math.abs(span - target) / target > 0.90) {
            const scale = target / span;
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            graph = {
              ...graph,
              nodes: graph.nodes.map((n) => ({
                ...n,
                x: Math.round(cx + ((n.x ?? 0) - cx) * scale),
                y: Math.round(cy + ((n.y ?? 0) - cy) * scale),
              })),
            };
          }
        }

        state.graph = graph;
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
        state.mode = 'default';
        state.filteredNodeIds = null;
        state.backdropUrl = loadBackdrop(graph.id);
      }),

    selectNode: (nodeId: string | null) => {
      set((state) => {
        // Push current node to history before switching
        if (nodeId !== null && state.selectedNodeId !== null && state.selectedNodeId !== nodeId) {
          state.navigationHistory.push(state.selectedNodeId);
          if (state.navigationHistory.length > 50) state.navigationHistory.shift();
        }
        // Mark new node as visited
        if (nodeId !== null) {
          state.visitedNodeIds.add(nodeId);
        }
        state.selectedNodeId = nodeId;
        state.selectedEdgeId = null;
        if (nodeId === null) state.mode = 'default';
      });
      // Persist visited outside immer draft (can't call localStorage inside immer)
      persistVisitedNodes(get().visitedNodeIds);
    },

    navigateBack: () => {
      set((state) => {
        const prevId = state.navigationHistory.pop();
        if (!prevId) return;
        state.selectedNodeId = prevId;
        state.selectedEdgeId = null;
        // Pan camera to the previous node
        if (state.graph) {
          const node = state.graph.nodes.find((n) => n.id === prevId);
          if (node && node.x != null && node.y != null) {
            state.pan = { x: -(node.x * state.zoom) + 80, y: -(node.y * state.zoom) };
          }
        }
      });
    },

    selectEdge: (edgeId: string | null) =>
      set((state) => {
        state.selectedEdgeId = edgeId;
        state.selectedNodeId = null;
        if (edgeId === null) state.mode = 'default';
      }),

    hoverNode: (nodeId: string | null) =>
      set((state) => { state.hoveredNodeId = nodeId; }),

    hoverEdge: (edgeId: string | null) =>
      set((state) => { state.hoveredEdgeId = edgeId; }),

    multiSelectNode: (nodeId: string) =>
      set((state) => {
        if (state.multiSelectedNodeIds.has(nodeId)) {
          state.multiSelectedNodeIds.delete(nodeId);
        } else {
          state.multiSelectedNodeIds.add(nodeId);
        }
        state.mode = 'multiselect';
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
        state.multiSelectedNodeIds = new Set();
        state.mode = 'default';
        state.filteredNodeIds = null;
        state.searchQuery = '';
      }),

    setMode: (mode: GraphMode) =>
      set((state) => { state.mode = mode; }),

    setZoom: (zoom: number) =>
      set((state) => { state.zoom = zoom; }),

    setPan: (pan: { x: number; y: number }) =>
      set((state) => { state.pan = pan; }),

    setSearchQuery: (query: string) =>
      set((state) => { state.searchQuery = query; }),

    setFilteredNodes: (nodeIds: Set<string> | null) =>
      set((state) => { state.filteredNodeIds = nodeIds; }),

    setGenerating: (isGenerating: boolean) =>
      set((state) => { state.isGenerating = isGenerating; }),

    toggleClusterMode: () =>
      set((state) => {
        state.isClusterModeActive = !state.isClusterModeActive;
        state.mode = state.isClusterModeActive ? 'cluster' : 'default';
      }),

    updateNodePosition: (nodeId: string, x: number, y: number) =>
      set((state) => {
        if (!state.graph) return;
        const node = state.graph.nodes.find((n) => n.id === nodeId);
        if (node) { node.x = x; node.y = y; }
      }),

    updateNodePositions: (positions: Array<{ id: string; x: number; y: number }>) =>
      set((state) => {
        if (!state.graph) return;
        const nodeMap = new Map(state.graph.nodes.map((n) => [n.id, n]));
        for (const pos of positions) {
          const node = nodeMap.get(pos.id);
          if (node) { node.x = pos.x; node.y = pos.y; }
        }
      }),

    addNodes: (nodes: GraphNode[]) =>
      set((state) => {
        if (!state.graph) return;
        state.graph.nodes.push(...nodes);
        state.graph.nodeCount = state.graph.nodes.length;
      }),

    addEdges: (edges: GraphEdge[]) =>
      set((state) => {
        if (!state.graph) return;
        state.graph.edges.push(...edges);
        state.graph.edgeCount = state.graph.edges.length;
      }),

    setClusters: (clusters: GraphCluster[]) =>
      set((state) => { state.clusters = clusters; }),

    setLearningState: (nodeId: string, state: LearningState) => {
      set((draft) => { draft.learningStates[nodeId] = state; });
      persistLearningStates(get().learningStates);
    },

    updateNode: (nodeId: string, updates: { label?: string; metadata?: Partial<GraphNode['metadata']> }) =>
      set((state) => {
        if (!state.graph) return;
        const node = state.graph.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (updates.label !== undefined) node.label = updates.label;
        if (updates.metadata) {
          node.metadata = { ...node.metadata, ...updates.metadata };
        }
        state.graph.updatedAt = new Date().toISOString();
      }),

    clearGraph: () =>
      set((state) => {
        state.graph = null;
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
        state.hoveredNodeId = null;
        state.hoveredEdgeId = null;
        state.mode = 'default';
        state.filteredNodeIds = null;
        state.searchQuery = '';
        state.navigationHistory = [];
        state.multiSelectedNodeIds = new Set();
      }),

    setBackdrop: (url: string | null) => {
      const graphId = get().graph?.id;
      set((state) => { state.backdropUrl = url; });
      if (graphId) persistBackdrop(graphId, url);
    },

    clearVisited: () => {
      set((state) => {
        state.visitedNodeIds = new Set();
        state.navigationHistory = [];
      });
      persistVisitedNodes(new Set());
    },

    fitToContent: (dimensions: { width: number; height: number }) =>
      set((draft) => {
        if (!draft.graph || draft.graph.nodes.length === 0) return;
        const nodes = draft.graph.nodes;
        if (nodes.length === 0) return;
        const maxR = Math.max(...nodes.map((n) => n.size ?? 12));
        const pad = maxR + 96;
        const xs = nodes.map((n) => n.x ?? 0);
        const ys = nodes.map((n) => n.y ?? 0);
        const minX = Math.min(...xs) - pad;
        const maxX = Math.max(...xs) + pad;
        const minY = Math.min(...ys) - pad;
        const maxY = Math.max(...ys) + pad;
        const gW = maxX - minX;
        const gH = maxY - minY;
        if (gW <= 0 || gH <= 0) return;
        const zoom = Math.max(0.35, Math.min(dimensions.width / gW, dimensions.height / gH, 2.0) * 1.05);
        draft.zoom = zoom;
        draft.pan = { x: -((minX + maxX) / 2) * zoom, y: -((minY + maxY) / 2) * zoom };
      }),

  })),
);

// ─── Derived Selectors ────────────────────────────────────────────────────────

export function getNeighborNodeIds(
  graph: GraphData | null,
  selectedNodeId: string | null,
): Set<string> {
  if (!graph || !selectedNodeId) return new Set();
  const ids = new Set<string>();
  for (const e of graph.edges) {
    if (e.sourceId === selectedNodeId) ids.add(e.targetId);
    if (e.targetId === selectedNodeId) ids.add(e.sourceId);
  }
  return ids;
}

export function getNeighborEdgeIds(
  graph: GraphData | null,
  selectedNodeId: string | null,
): Set<string> {
  if (!graph || !selectedNodeId) return new Set();
  const ids = new Set<string>();
  for (const e of graph.edges) {
    if (e.sourceId === selectedNodeId || e.targetId === selectedNodeId) ids.add(e.id);
  }
  return ids;
}
