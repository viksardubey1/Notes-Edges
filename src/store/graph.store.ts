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

// ── Progressive disclosure helpers ────────────────────────────────────────────

/**
 * Build a neighbour adjacency map sorted by edge weight descending.
 * Returns Map<nodeId, [{nodeId, weight}]>
 */
function buildAdjacency(edges: GraphEdge[]): Map<string, { nodeId: string; weight: number }[]> {
  const adj = new Map<string, { nodeId: string; weight: number }[]>();
  for (const e of edges) {
    const push = (from: string, to: string) => {
      const list = adj.get(from) ?? [];
      list.push({ nodeId: to, weight: e.weight });
      adj.set(from, list);
    };
    push(e.sourceId, e.targetId);
    push(e.targetId, e.sourceId);
  }
  // Sort each neighbour list by weight desc
  for (const [, list] of adj) list.sort((a, b) => b.weight - a.weight);
  return adj;
}

/**
 * Compute the initial revealed set: root node (highest centrality) + top-5 neighbours.
 */
function computeInitialRevealed(graph: GraphData): Set<string> {
  if (graph.nodes.length === 0) return new Set();
  // Prefer the intelligenceSummary mainConcept, otherwise highest centrality node
  const rootId = graph.intelligenceSummary?.mainConcept
    ? graph.nodes.find((n) => n.id === graph.intelligenceSummary!.mainConcept)?.id
    : undefined;
  const root = rootId
    ? graph.nodes.find((n) => n.id === rootId)
    : graph.nodes.reduce((a, b) => (a.centrality > b.centrality ? a : b));
  if (!root) return new Set();

  const adj = buildAdjacency(graph.edges);
  const neighbours = (adj.get(root.id) ?? []).slice(0, 5).map((n) => n.nodeId);
  return new Set([root.id, ...neighbours]);
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
    zoom: 1,
    pan: { x: 0, y: 0 },

    // ─── Filters ─────────────────────────────────────────────────────────────
    searchQuery: '',
    filteredNodeIds: null,

    // ─── UI flags ────────────────────────────────────────────────────────────
    isGenerating: false,
    isClusterModeActive: false,

    // ─── Progressive disclosure ───────────────────────────────────────────────
    revealedNodeIds: null,
    progressiveMode: false,

    // ─── Learning states (persisted) ─────────────────────────────────────────
    learningStates: loadLearningStates(),

    // ─── Visit history ────────────────────────────────────────────────────────
    visitedNodeIds: loadVisitedNodes(),
    navigationHistory: [] as string[],

    // ─── Actions ─────────────────────────────────────────────────────────────

    setGraph: (graph: GraphData) =>
      set((state) => {
        // Spread normalization: clamp node positions to a comfortable span so
        // fitToContent always produces a readable zoom level.
        // Target span scales with node count: ~80px per node, clamped 600–900px.
        const xs = graph.nodes.map((n) => n.x ?? 0);
        const ys = graph.nodes.map((n) => n.y ?? 0);
        if (graph.nodes.length > 2) {
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const span = Math.max(maxX - minX, maxY - minY);
          const target = Math.max(600, Math.min(900, 80 * Math.sqrt(graph.nodes.length)));
          if (span > 0 && Math.abs(span - target) / target > 0.15) {
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
        state.revealedNodeIds = null;
        state.progressiveMode = false;
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
        state.revealedNodeIds = null;
        state.progressiveMode = false;
        state.navigationHistory = [];
        state.multiSelectedNodeIds = new Set();
      }),

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
        // In progressive mode, fit to the revealed subset only
        const nodes = draft.progressiveMode && draft.revealedNodeIds
          ? draft.graph.nodes.filter((n) => draft.revealedNodeIds!.has(n.id))
          : draft.graph.nodes;
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
        const zoom = Math.max(0.3, Math.min(dimensions.width / gW, dimensions.height / gH, 1.6) * 0.85);
        draft.zoom = zoom;
        draft.pan = { x: -((minX + maxX) / 2) * zoom, y: -((minY + maxY) / 2) * zoom };
      }),

    // ── Progressive disclosure actions ────────────────────────────────────────

    revealNode: (nodeId: string) =>
      set((state) => {
        if (!state.graph || !state.progressiveMode) return;
        if (!state.revealedNodeIds) {
          state.revealedNodeIds = new Set([nodeId]);
        } else {
          state.revealedNodeIds.add(nodeId);
        }
        // Reveal top-3 unshown neighbours of this node by edge weight
        const neighbours = state.graph.edges
          .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
          .map((e) => ({
            nId: e.sourceId === nodeId ? e.targetId : e.sourceId,
            weight: e.weight,
          }))
          .filter((n) => !state.revealedNodeIds!.has(n.nId))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3);
        for (const { nId } of neighbours) state.revealedNodeIds.add(nId);
        // Auto-exit progressive mode once all nodes are revealed
        if (state.revealedNodeIds.size >= state.graph.nodes.length) {
          state.revealedNodeIds = null;
          state.progressiveMode = false;
        }
      }),

    toggleNeighborVisibility: (nodeId: string) =>
      set((state) => {
        if (!state.graph) return;
        // Auto-enter progressive mode if not already active
        if (!state.progressiveMode || !state.revealedNodeIds) {
          state.revealedNodeIds = computeInitialRevealed(state.graph);
          state.progressiveMode = true;
        }
        if (!state.revealedNodeIds) return;
        if (state.revealedNodeIds.has(nodeId)) {
          // Hide: only if it won't orphan itself (has at least one other revealed connection)
          const otherRevealedConnections = state.graph.edges.filter(
            (e) =>
              (e.sourceId === nodeId || e.targetId === nodeId) &&
              state.revealedNodeIds!.has(e.sourceId === nodeId ? e.targetId : e.sourceId),
          );
          if (otherRevealedConnections.length > 0) {
            state.revealedNodeIds.delete(nodeId);
          }
          // If it would be orphaned, just delete anyway — user explicitly asked
          else {
            state.revealedNodeIds.delete(nodeId);
          }
        } else {
          // Reveal
          state.revealedNodeIds.add(nodeId);
        }
        // Auto-exit progressive mode once all nodes are revealed
        if (state.revealedNodeIds.size >= state.graph.nodes.length) {
          state.revealedNodeIds = null;
          state.progressiveMode = false;
        }
      }),

    revealAllNeighbors: (nodeId: string) =>
      set((state) => {
        if (!state.graph || !state.progressiveMode) return;
        if (!state.revealedNodeIds) state.revealedNodeIds = new Set([nodeId]);
        const neighbourIds = state.graph.edges
          .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
          .map((e) => (e.sourceId === nodeId ? e.targetId : e.sourceId));
        for (const nId of neighbourIds) state.revealedNodeIds.add(nId);
        if (state.revealedNodeIds.size >= state.graph.nodes.length) {
          state.revealedNodeIds = null;
          state.progressiveMode = false;
        }
      }),

    hideNeighbors: (nodeId: string) =>
      set((state) => {
        if (!state.graph) return;
        // Auto-enter progressive mode if not already active
        if (!state.progressiveMode || !state.revealedNodeIds) {
          state.revealedNodeIds = computeInitialRevealed(state.graph);
          state.progressiveMode = true;
        }
        if (!state.revealedNodeIds) return;
        // Collect all direct neighbours
        const directNeighbours = new Set(
          state.graph.edges
            .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
            .map((e) => (e.sourceId === nodeId ? e.targetId : e.sourceId)),
        );
        // Only remove a neighbour if it has no other revealed node pointing to it
        // (i.e. its only revealed connection is nodeId) — prevents orphaning
        for (const nId of directNeighbours) {
          const otherRevealedConnections = state.graph.edges.filter(
            (e) =>
              (e.sourceId === nId || e.targetId === nId) &&
              e.sourceId !== nodeId &&
              e.targetId !== nodeId &&
              state.revealedNodeIds!.has(e.sourceId === nId ? e.targetId : e.sourceId),
          );
          if (otherRevealedConnections.length === 0) {
            state.revealedNodeIds.delete(nId);
          }
        }
      }),

    showFullGraph: () =>
      set((state) => {
        state.revealedNodeIds = null;
        state.progressiveMode = false;
      }),

    resetProgressiveMode: () =>
      set((state) => {
        if (!state.graph) return;
        state.revealedNodeIds = computeInitialRevealed(state.graph);
        state.progressiveMode = true;
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
