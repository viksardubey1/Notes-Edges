/**
 * Level of Detail (LOD) System — Notes & Edges
 *
 * Four zoom tiers control what is rendered at each scale level.
 * Transitions between tiers use opacity crossfade — never a hard pop.
 *
 * Tier 1 (< 0.3x):   Top 20% nodes by centrality. No edges. No labels.
 * Tier 2 (0.3–0.7x): Top 50% nodes. Strong edges (weight > 0.7). Labels on hover.
 * Tier 3 (0.7–1.5x): All nodes. All edges (weight-based opacity). All labels.
 * Tier 4 (> 1.5x):   Full detail. Edge labels without hover.
 */

import type { LODLevel } from '@/types/graph';
import { lod as thresholds } from '@/lib/tokens';

export type LODTier = 1 | 2 | 3 | 4;

/**
 * Determine the current LOD tier from zoom level.
 */
export function getLODTier(zoom: number): LODTier {
  if (zoom < thresholds.minimal) return 1;
  if (zoom < thresholds.reduced) return 2;
  if (zoom <= thresholds.full) return 3;
  return 4;
}

/**
 * Get the LOD configuration for a given zoom level.
 */
export function getLODLevel(zoom: number): LODLevel {
  const tier = getLODTier(zoom);

  switch (tier) {
    case 1:
      return {
        showTopNodePercent: 0.2,
        showEdges: false,
        showStrongEdgesOnly: false,
        showLabels: false,
        showLabelsOnHover: false,
        showEdgeLabels: false,
      };
    case 2:
      return {
        showTopNodePercent: 0.5,
        showEdges: true,
        showStrongEdgesOnly: true,
        showLabels: false,
        showLabelsOnHover: true,
        showEdgeLabels: false,
      };
    case 3:
      return {
        showTopNodePercent: 1.0,
        showEdges: true,
        showStrongEdgesOnly: false,
        showLabels: true,
        showLabelsOnHover: true,
        showEdgeLabels: false,
      };
    case 4:
      return {
        showTopNodePercent: 1.0,
        showEdges: true,
        showStrongEdgesOnly: false,
        showLabels: true,
        showLabelsOnHover: true,
        showEdgeLabels: false,
      };
  }
}

/**
 * Determine if a node should be visible at the current zoom level
 * based on its centrality rank within the full node set.
 */
export function isNodeVisibleAtZoom(
  centralityRank: number,  // 0 = highest centrality, 1 = lowest (normalized 0–1)
  zoom: number,
): boolean {
  const lodLevel = getLODLevel(zoom);
  return centralityRank <= lodLevel.showTopNodePercent;
}

/**
 * Calculate the label font size scaled by zoom.
 * Base: 12px at 1x zoom. Below 9px effective render size: hide entirely.
 */
export function getLabelRenderSize(zoom: number, basePx: number = 12): number {
  return basePx * zoom;
}

export function shouldRenderLabel(zoom: number, basePx: number = 12): boolean {
  return getLabelRenderSize(zoom, basePx) >= 9;
}

/**
 * Get the opacity crossfade progress between two LOD tiers (0–1).
 * Used to smoothly interpolate during zoom transitions.
 */
export function getLODTransitionProgress(zoom: number): number {
  const buffer = 0.05; // 5% zoom buffer for smooth transition

  if (zoom < thresholds.minimal) {
    return clamp((thresholds.minimal - zoom) / buffer, 0, 1);
  }
  if (zoom < thresholds.reduced) {
    return clamp((zoom - thresholds.minimal) / buffer, 0, 1);
  }
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
