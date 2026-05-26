/**
 * Design Token System — Notes & Edges
 *
 * Three-layer architecture:
 *   Layer 1 — Primitive: raw values
 *   Layer 2 — Semantic: meaning-mapped tokens
 *   Layer 3 — Component: component-specific tokens (in component files)
 *
 * CSS variables are the source of truth at runtime.
 * These TypeScript constants mirror the CSS variables for type-safe usage in JS (e.g., D3, Canvas).
 */

// ─── Layer 1: Primitive Tokens ────────────────────────────────────────────────

export const primitive = {
  color: {
    // UI Base
    void: '#0A0A0F',
    obsidian: '#111118',
    slate: '#1A1A26',
    hairline: '#2A2A3F',
    chalk: '#F0F0F5',
    mist: '#8888AA',
    ghost: '#4A4A6A',
    arcBlue: '#4D7FFF',
    arcGlow: '#4D7FFF22',

    // Graph Specific
    deepSlate: '#1E1E30',
    nodeRing: '#3A3A5C',
    hoverSlate: '#2A2A45',
    darkWire: '#2A2A4A',
    signalBlue: '#5A6FCC',
    shadowWire: '#1E1E35',

    // Cluster Colors
    clusterViolet: '#7B5EA7',
    clusterForest: '#3D8A6E',
    clusterAmber: '#B06040',
  },

  spacing: {
    unit: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  duration: {
    micro: 150,
    fast: 200,
    panel: 350,
    graphMin: 800,
    graphMax: 2500,
    graphBuild: 1500,
  },

  easing: {
    default: 'ease-out',
    panel: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    camera: 'ease-in-out',
  },

  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    lg: '17px',
    xl: '21px',
    '2xl': '27px',
    displaySm: '36px',
    display: '48px',
    displayLg: '72px',
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
  },
} as const;

// ─── Layer 2: Semantic Tokens ─────────────────────────────────────────────────

export const semantic = {
  color: {
    background: {
      base: primitive.color.void,
      surface1: primitive.color.obsidian,
      surface2: primitive.color.slate,
    },
    border: {
      default: primitive.color.hairline,
    },
    text: {
      primary: primitive.color.chalk,
      secondary: primitive.color.mist,
      tertiary: primitive.color.ghost,
    },
    accent: {
      primary: primitive.color.arcBlue,
      glow: primitive.color.arcGlow,
    },
    graph: {
      nodeFill: primitive.color.deepSlate,
      nodeRing: primitive.color.nodeRing,
      nodeSelected: primitive.color.arcBlue,
      nodeHover: primitive.color.hoverSlate,
      edgeDefault: primitive.color.darkWire,
      edgeStrong: primitive.color.signalBlue,
      edgeWeak: primitive.color.shadowWire,
      clusterA: primitive.color.clusterViolet,
      clusterB: primitive.color.clusterForest,
      clusterC: primitive.color.clusterAmber,
    },
    cluster: [
      primitive.color.clusterViolet,
      primitive.color.clusterForest,
      primitive.color.clusterAmber,
    ],
  },

  spacing: {
    cardPadding: '24px',
    sidebarPadding: '20px',
    commandBarPadding: '24px',
    touchTarget: '44px',
  },

  layout: {
    commandBarHeight: 48,
    sidebarWidth: 248,
    sidebarCollapsedWidth: 44,
    sidebarWideWidth: 268,
    nodeDetailPanelWidth: 320,
    minimapWidth: 160,
    minimapHeight: 120,
    uploadSheetHeight: 500,
  },

  duration: {
    micro: `${primitive.duration.micro}ms`,
    fast: `${primitive.duration.fast}ms`,
    panel: `${primitive.duration.panel}ms`,
    graphBuild: `${primitive.duration.graphBuild}ms`,
  },

  typography: {
    letterSpacing: {
      body: '0.01em',
      uppercase: '0.06em',
      display: '0',
    },
    nodeLabel: {
      size: '12px',
      weight: '500',
      family: 'Geist',
    },
    edgeLabel: {
      size: '10px',
      weight: '400',
      color: primitive.color.mist,
    },
  },
} as const;

// ─── Graph Zoom LOD Thresholds ────────────────────────────────────────────────

export const lod = {
  minimal: 0.3,   // < 0.3x: top 20% nodes, no edges, no labels
  reduced: 0.7,   // 0.3–0.7x: top 50% nodes, strong edges only, labels on hover
  full: 1.5,      // 0.7–1.5x: all nodes/edges, labels visible
  detailed: 1.5,  // > 1.5x: edge labels visible without hover
} as const;

// ─── Graph Physics Constants ──────────────────────────────────────────────────

export const physics = {
  targetEdgeLengthMin: 80,
  targetEdgeLengthMax: 120,
  maxEdgesRendered: 2000,
  webglThreshold: 500,       // switch to WebGL above this node count
  workerThreshold: 200,      // use Web Worker for D3 above this count
  ambientFloatPx: 2,
  ambientFloatDuration: 4000,
  settleDuration: 2000,
} as const;

export type PrimitiveTokens = typeof primitive;
export type SemanticTokens = typeof semantic;
