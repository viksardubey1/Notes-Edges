/**
 * Graph Type Definitions — Notes & Edges
 * All graph data types. Never use `any` — strict TypeScript throughout.
 */

// ─── Semantic Edge Types ──────────────────────────────────────────────────────

export type SemanticEdgeType =
  | 'ENABLES'     // A makes B possible
  | 'IS_A'        // Taxonomic / definitional
  | 'CAUSES'      // Causal relationship
  | 'CONTRASTS'   // Opposition or tension
  | 'PART_OF'     // Compositional
  | 'DEPENDS_ON'  // Dependency / prerequisite
  | 'LEADS_TO'    // Sequential / temporal
  | 'RELATES_TO'; // Weak associative (fallback)

// ─── Comprehension Depth ─────────────────────────────────────────────────────

export type DepthLevel = 'surface' | 'explained' | 'mastered';

// ─── Intelligence Summary ─────────────────────────────────────────────────────

export interface GraphIntelligenceSummary {
  strongAreas: string[];
  weakAreas: string[];
  mainConcept: string;       // node id of most central concept
  mostIsolatedConcept: string; // node id with fewest connections
  gaps: string[];            // specific knowledge gaps identified
  suggestion: string;        // actionable next-upload suggestion
  overview: string;          // 2-3 sentence synthesis
}

// ─── Quiz Types ───────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  type: 'concept' | 'relationship' | 'application';
  choices: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface QuizAttempt {
  score: number;
  total: number;
  completedAt: string;
}

export interface GraphQuiz {
  questions: QuizQuestion[];
  generatedAt: string;
  attempts?: QuizAttempt[];
}

// ─── Core Graph Data Model ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'relation' | 'orphan';
  sourceId: string;
  embedding?: number[];
  metadata: {
    summary?: string;             // Context-aware summary grounded in source text
    sourceQuote?: string;         // Direct quote from user's notes
    whyItMatters?: string;        // Why this concept is important in context
    depthLevel?: DepthLevel;      // AI assessment of user's understanding depth
    gaps?: string[];              // Missing connections the AI identified
    expansionSuggestions?: string[]; // Related concepts not yet in the graph
    [key: string]: unknown;
  };
  createdAt: string;

  // Layout state (client-side, cached)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;

  // Visual properties
  size: number;
  centrality: number;
  clusterId?: string;
  clusterColor?: string;
  clusterName?: string;     // Human-readable cluster label
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  weight: number;
  type: 'semantic' | 'explicit' | 'temporal';
  semanticType?: SemanticEdgeType; // Typed relationship ontology
  explanation?: string;            // AI-generated one-sentence relationship explanation
  createdAt: string;
}

export interface GraphData {
  id: string;
  userId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  intelligenceSummary?: GraphIntelligenceSummary;
  quiz?: GraphQuiz;
}

export interface GraphSource {
  id: string;
  graphId: string;
  type: 'pdf' | 'text' | 'url';
  rawContent?: string;
  filename?: string;
  processedAt?: string;
}

// ─── Graph Cluster ────────────────────────────────────────────────────────────

export interface GraphCluster {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
  centroid: { x: number; y: number };
}

// ─── Learning State ───────────────────────────────────────────────────────────

export type LearningState = 'unset' | 'understood' | 'reviewing' | 'weak' | 'mastered';

// ─── Graph State (Zustand) ────────────────────────────────────────────────────

export interface GraphState {
  graph: GraphData | null;
  clusters: GraphCluster[];
  sources: GraphSource[];

  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  multiSelectedNodeIds: Set<string>;

  mode: GraphMode;

  zoom: number;
  pan: { x: number; y: number };

  searchQuery: string;
  filteredNodeIds: Set<string> | null;

  isGenerating: boolean;
  isClusterModeActive: boolean;

  /** Per-node learning state, persisted to localStorage */
  learningStates: Record<string, LearningState>;

  /** Nodes the user has opened at least once, persisted */
  visitedNodeIds: Set<string>;
  /** Stack of previously selected node IDs for back navigation (session only) */
  navigationHistory: string[];

  /** Custom backdrop image — data URL, persisted per graph ID */
  backdropUrl: string | null;

  setGraph: (graph: GraphData) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  hoverEdge: (edgeId: string | null) => void;
  multiSelectNode: (nodeId: string) => void;
  clearSelection: () => void;
  setMode: (mode: GraphMode) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSearchQuery: (query: string) => void;
  setFilteredNodes: (nodeIds: Set<string> | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  toggleClusterMode: () => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  updateNodePositions: (positions: Array<{ id: string; x: number; y: number }>) => void;
  addNodes: (nodes: GraphNode[]) => void;
  addEdges: (edges: GraphEdge[]) => void;
  setClusters: (clusters: GraphCluster[]) => void;
  setLearningState: (nodeId: string, state: LearningState) => void;
  /** Update a node's label and/or metadata fields. */
  updateNode: (nodeId: string, updates: { label?: string; metadata?: Partial<GraphNode['metadata']> }) => void;
  /** Clear the current graph and reset all graph state. */
  clearGraph: () => void;
  /** Mark all nodes as unvisited, resetting exploration progress. */
  clearVisited: () => void;
  /** Go back to the previously selected node. */
  navigateBack: () => void;
  fitToContent: (dimensions: { width: number; height: number }) => void;
  /** Set or clear the graph backdrop image. */
  setBackdrop: (url: string | null) => void;
}

export type GraphMode =
  | 'default'
  | 'neighborhood'
  | 'focus'
  | 'cluster'
  | 'multiselect'
  | 'search';

// ─── Graph Rendering ──────────────────────────────────────────────────────────

export type RendererType = 'svg' | 'webgl';

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
}

export interface LODLevel {
  showTopNodePercent: number;
  showEdges: boolean;
  showStrongEdgesOnly: boolean;
  showLabels: boolean;
  showLabelsOnHover: boolean;
  showEdgeLabels: boolean;
}

export interface LayoutOptions {
  type: 'force' | 'hierarchical' | 'cluster';
  useWorker: boolean;
}

export interface ForceLayoutConfig {
  chargeStrength: number;
  linkDistance: number;
  linkStrength: number;
  collideRadius: number;
  centerX: number;
  centerY: number;
  alphaDecay: number;
  velocityDecay: number;
}

export interface NodeVisualState {
  opacity: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  radius: number;
  labelVisible: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isNeighbor: boolean;
  isDimmed: boolean;
}

export interface EdgeVisualState {
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  labelVisible: boolean;
}
