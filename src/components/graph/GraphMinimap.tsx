/**
 * GraphMinimap — Notes & Edges
 *
 * 160×120px minimap in the bottom-right corner.
 * Shows full graph extent with a viewport indicator rectangle.
 */

'use client';

import { useMemo } from 'react';
import type { GraphData } from '@/types/graph';
import { semantic, primitive } from '@/lib/tokens';

interface GraphMinimapProps {
  graph: GraphData;
  zoom: number;
  pan: { x: number; y: number };
  dimensions: { width: number; height: number };
}

const MINIMAP_WIDTH = semantic.layout.minimapWidth;
const MINIMAP_HEIGHT = semantic.layout.minimapHeight;

export function GraphMinimap({ graph, zoom, pan, dimensions }: GraphMinimapProps) {
  // Compute graph bounds from node positions
  const bounds = useMemo(() => {
    const positioned = graph.nodes.filter((n) => n.x !== undefined && n.y !== undefined);
    if (positioned.length === 0) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };

    return positioned.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x!),
        maxX: Math.max(acc.maxX, node.x!),
        minY: Math.min(acc.minY, node.y!),
        maxY: Math.max(acc.maxY, node.y!),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );
  }, [graph.nodes]);

  const graphWidth = bounds.maxX - bounds.minX + 100;
  const graphHeight = bounds.maxY - bounds.minY + 100;

  const scaleX = MINIMAP_WIDTH / graphWidth;
  const scaleY = MINIMAP_HEIGHT / graphHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9;

  const toMinimapX = (x: number) =>
    (x - bounds.minX + 50) * scale + (MINIMAP_WIDTH - graphWidth * scale) / 2;
  const toMinimapY = (y: number) =>
    (y - bounds.minY + 50) * scale + (MINIMAP_HEIGHT - graphHeight * scale) / 2;

  // Viewport indicator
  const vpX = toMinimapX(-pan.x / zoom - dimensions.width / 2 / zoom);
  const vpY = toMinimapY(-pan.y / zoom - dimensions.height / 2 / zoom);
  const vpW = (dimensions.width / zoom) * scale;
  const vpH = (dimensions.height / zoom) * scale;

  return (
    <div
      className="relative rounded-[8px] overflow-hidden backdrop-blur-sm"
      style={{
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid var(--border-default)',
      }}
      aria-hidden="true"
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        {/* Nodes */}
        {graph.nodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null;
          return (
            <circle
              key={node.id}
              cx={toMinimapX(node.x)}
              cy={toMinimapY(node.y)}
              r={Math.max(1.5, (node.size ?? 8) * scale * 0.5)}
              fill={node.clusterColor ?? '#6B58C0'}
              opacity={0.6}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={vpX}
          y={vpY}
          width={Math.abs(vpW)}
          height={Math.abs(vpH)}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
