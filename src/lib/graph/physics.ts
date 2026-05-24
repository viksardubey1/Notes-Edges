/**
 * Graph Physics Configuration — Notes & Edges
 *
 * D3-force simulation config for the main graph layout engine.
 * Rules:
 * - Simulation MUST stop completely after settling (no idle CPU).
 * - Target edge length: 80–120px at 1x zoom.
 * - Within-cluster repulsion > between-cluster repulsion (anti-hairball).
 * - Use Web Worker above 200 nodes.
 * - Use WebGL renderer above 500 nodes.
 */

import type { ForceLayoutConfig } from '@/types/graph';
import { physics as physicsTokens } from '@/lib/tokens';

/**
 * Default force simulation configuration.
 * Tuned for knowledge graphs with community structure.
 */
export const DEFAULT_FORCE_CONFIG: ForceLayoutConfig = {
  chargeStrength: -300,          // Node repulsion — strong enough to prevent overlap
  linkDistance: 100,             // Target: 80–120px midpoint
  linkStrength: 0.7,             // Edge spring strength
  collideRadius: 1.2,            // Multiplier on node radius for collision
  centerX: 0,                    // Relative center — set dynamically from canvas size
  centerY: 0,
  alphaDecay: 0.02,              // How fast simulation cools (higher = faster settle)
  velocityDecay: 0.4,            // Friction — higher = less oscillation
};

/**
 * Dense graph config — used when nodeCount > 100.
 * More repulsion to spread nodes, faster cooling to avoid hairball.
 */
export const DENSE_FORCE_CONFIG: ForceLayoutConfig = {
  ...DEFAULT_FORCE_CONFIG,
  chargeStrength: -500,
  linkDistance: 120,
  alphaDecay: 0.025,
  velocityDecay: 0.45,
};

/**
 * Cluster-aware force config.
 * Pre-positioned cluster centroids get a weak gravity pull to stay grouped.
 */
export const CLUSTER_FORCE_CONFIG: ForceLayoutConfig = {
  ...DEFAULT_FORCE_CONFIG,
  chargeStrength: -200,
  linkDistance: 80,
  linkStrength: 0.9,
};

/**
 * Get the appropriate force config based on graph size.
 */
export function getForceConfig(nodeCount: number): ForceLayoutConfig {
  if (nodeCount > 100) return DENSE_FORCE_CONFIG;
  return DEFAULT_FORCE_CONFIG;
}

/**
 * Determine if the graph should use a Web Worker for simulation.
 */
export function shouldUseWorker(nodeCount: number): boolean {
  return nodeCount > physicsTokens.workerThreshold;
}

/**
 * Determine if the graph should use the WebGL renderer.
 */
export function shouldUseWebGL(nodeCount: number): boolean {
  return nodeCount >= physicsTokens.webglThreshold;
}

/**
 * Calculate graph build animation duration based on node count.
 * Range: 1500–2500ms, scales linearly with node count up to 100 nodes.
 */
export function getGraphBuildDuration(nodeCount: number): number {
  const minDuration = 1500;
  const maxDuration = 2500;
  const normalizedCount = Math.min(nodeCount, 100) / 100;
  return minDuration + (maxDuration - minDuration) * normalizedCount;
}

/**
 * Calculate stagger delay per node during graph build animation.
 * Total duration spread across all nodes in cluster order.
 */
export function getNodeStaggerDelay(
  nodeIndex: number,
  totalNodes: number,
  buildDuration: number,
): number {
  const maxStagger = buildDuration * 0.6; // First 60% of build time for node reveals
  return (nodeIndex / totalNodes) * maxStagger;
}

/**
 * Compute normalized centrality score (0–1) from raw connection count
 * and an optional semantic importance score.
 */
export function computeCentrality(
  connectionCount: number,
  maxConnections: number,
  semanticScore: number = 0.5, // 0–1
): number {
  if (maxConnections === 0) return 0;
  const topologicalCentrality = connectionCount / maxConnections;
  // Weight: 70% topological, 30% semantic
  return 0.7 * topologicalCentrality + 0.3 * semanticScore;
}

/**
 * Compute node radius from centrality (8–28px range).
 */
export function computeNodeRadius(centrality: number): number {
  const minRadius = 8;
  const maxRadius = 28;
  return minRadius + (maxRadius - minRadius) * Math.sqrt(centrality);
}

/**
 * Get initial positions for cluster centroids, evenly distributed
 * in a circle around the canvas center before simulation starts.
 * Pre-positioning prevents hairball formation.
 */
export function getClusterCentroidPositions(
  clusterCount: number,
  canvasWidth: number,
  canvasHeight: number,
  radius: number = 200,
): Array<{ x: number; y: number }> {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  return Array.from({ length: clusterCount }, (_, i) => {
    const angle = (i / clusterCount) * 2 * Math.PI;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}
