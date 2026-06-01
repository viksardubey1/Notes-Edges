/**
 * edge-config.ts — Single source of truth for all graph edge styling.
 *
 * Every edge — AI-generated, manually created, or imported — must inherit
 * from these constants. Do NOT define edge colors, widths, or semantic
 * labels anywhere else in the codebase.
 *
 * Hierarchy:
 *   EDGE_STROKE_WIDTH / EDGE_STROKE_COLOR   → graph canvas line rendering
 *   EDGE_WIDTH_MULT / EDGE_HALO             → interactive state overrides
 *   SEMANTIC_TYPE_CONFIG                    → UI panels & badge accents ONLY
 */

import type { SemanticEdgeType } from '@/types/graph';

// ── Base rendering constants ──────────────────────────────────────────────────

/** Stroke width applied to every edge on the graph canvas, regardless of type. */
export const EDGE_STROKE_WIDTH = 1.0;

/** Stroke color applied to every edge on the graph canvas, regardless of type. */
export const EDGE_STROKE_COLOR = 'var(--color-edge-default)';

/** Quadratic bezier curvature: offset = min(len × tension, maxOffset). */
export const EDGE_CURVE_TENSION    = 0.22;
export const EDGE_CURVE_MAX_OFFSET = 80; // px

// ── State width multipliers ───────────────────────────────────────────────────
// Applied on top of EDGE_STROKE_WIDTH during interaction states.

export const EDGE_WIDTH_MULT = {
  selected:  2.5,
  neighbor:  2.0,
  hovered:   1.75,
  emergence: 4.0, // one-shot flash animation
} as const;

// ── Halo (soft glow ring rendered behind the active stroke) ───────────────────

export const EDGE_HALO = {
  widthMult:       8.0,
  selectedOpacity: 0.14,
  hoveredOpacity:  0.09,
} as const;

// ── Semantic type config — UI panels and badges ONLY ─────────────────────────
// Never use these accent colors for the graph canvas edge stroke.

export interface SemanticTypeConfig {
  /** Display name (e.g. "Is a type of"). */
  label: string;
  /** Verb form for "A {verb} B" sentences. */
  verb: string;
  /** Accent color — for panel badges, labels, and mini-visualisations. */
  color: string;
  /** Badge background at 6% opacity. */
  bg: string;
  /** Badge border at 16% opacity. */
  border: string;
  /** One-sentence description shown in EdgeDetailPanel. */
  description: string;
  /** Editorial insight pullquote shown in EdgeDetailPanel. */
  insight: string;
}

export const SEMANTIC_TYPE_CONFIG: Record<SemanticEdgeType, SemanticTypeConfig> = {
  ENABLES: {
    label: 'Enables',      verb: 'enables',
    color: '#4CAF8A', bg: '#4CAF8A10', border: '#4CAF8A28',
    description: 'Understanding A makes it possible to understand B.',
    insight:     'This is a gateway relationship. Once A clicks, B opens up naturally.',
  },
  IS_A: {
    label: 'Is a type of', verb: 'is a type of',
    color: '#9090BB', bg: '#9090BB10', border: '#9090BB28',
    description: 'A is a specific example or subtype of B.',
    insight:     "Look at B first — it's the broader category. Then A is one instance of that pattern.",
  },
  CAUSES: {
    label: 'Causes',       verb: 'causes',
    color: '#E07B50', bg: '#E07B5010', border: '#E07B5028',
    description: 'A directly produces or triggers B.',
    insight:     'Trace the mechanism. When you see A in a problem, ask what it will produce downstream.',
  },
  CONTRASTS: {
    label: 'Contrasts',    verb: 'contrasts with',
    color: '#9B72CC', bg: '#9B72CC10', border: '#9B72CC28',
    description: 'A and B are in tension — understanding the difference is key.',
    insight:     'Test yourself: in what specific situation would you choose one over the other?',
  },
  PART_OF: {
    label: 'Part of',      verb: 'is part of',
    color: '#8888AA', bg: '#8888AA10', border: '#8888AA28',
    description: 'A is a component or sub-concept within B.',
    insight:     'Find the whole before studying the part. B gives A its purpose and context.',
  },
  DEPENDS_ON: {
    label: 'Depends on',   verb: 'depends on',
    color: '#C4973A', bg: '#C4973A10', border: '#C4973A28',
    description: 'You need to understand B before A makes full sense.',
    insight:     "This is a prerequisite. If A isn't landing, revisit B — the foundation may be shaky.",
  },
  LEADS_TO: {
    label: 'Leads to',     verb: 'leads to',
    color: '#6B9FFF', bg: '#6B9FFF10', border: '#6B9FFF28',
    description: 'A comes first in a sequence — B follows naturally.',
    insight:     'Trace the full chain. Where does the path go after B?',
  },
  RELATES_TO: {
    label: 'Relates to',   verb: 'relates to',
    color: '#6A7A9A', bg: '#6A7A9A10', border: '#6A7A9A28',
    description: 'A and B share context or often appear together.',
    insight:     'Look for the hidden pattern. Why do these two ideas keep showing up together?',
  },
};

// ── Short abbreviations for the EdgeLabelPill on the graph canvas ─────────────

export const SEMANTIC_TYPE_ABBR: Partial<Record<SemanticEdgeType, string>> = {
  ENABLES:    'enables',
  IS_A:       'is a',
  CAUSES:     'causes',
  CONTRASTS:  'vs',
  PART_OF:    'part of',
  DEPENDS_ON: 'needs',
  LEADS_TO:   'leads to',
  RELATES_TO: '~',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the accent color for a semantic type, or the muted default. */
export function semanticColor(type: SemanticEdgeType | undefined): string {
  if (!type) return SEMANTIC_TYPE_CONFIG.RELATES_TO.color;
  return SEMANTIC_TYPE_CONFIG[type]?.color ?? SEMANTIC_TYPE_CONFIG.RELATES_TO.color;
}
