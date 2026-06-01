import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conflict resolution.
 * The canonical `cn()` utility for all components.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a relative time string (e.g. "2 hours ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Truncate a string to max words with ellipsis.
 * Used for node labels (max 4–5 words per spec).
 */
export function truncateWords(text: string, maxWords: number = 5): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Generate a stable ID from a string (for deterministic positioning).
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Check if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get node radius from centrality score.
 * Hub nodes are larger, leaf nodes are smaller.
 */
export function nodeRadiusFromCentrality(
  centrality: number,
  minRadius: number = 8,
  maxRadius: number = 28,
): number {
  // centrality is 0–1 normalized
  return minRadius + (maxRadius - minRadius) * Math.sqrt(centrality);
}

/**
 * Get edge opacity from weight.
 */
export function edgeOpacityFromWeight(weight: number): number {
  if (weight >= 0.7) return 0.8;
  if (weight >= 0.4) return 0.5;
  return 0.2;
}

/**
 * Get edge stroke width from weight.
 * All edges use the same canonical width regardless of weight — weight
 * is expressed through opacity, not thickness.
 */
export function edgeStrokeFromWeight(_weight: number): number {
  return 1.0; // matches EDGE_STROKE_WIDTH in edge-config.ts
}
