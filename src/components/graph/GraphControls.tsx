/**
 * GraphControls — Notes & Edges
 *
 * Zoom controls: +, -, fit-to-screen.
 * Position: bottom-right corner of the graph canvas.
 */

'use client';

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GraphControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

export function GraphControls({ zoom, onZoomIn, onZoomOut, onFitToScreen }: GraphControlsProps) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-[12px] p-1"
      style={{
        background: 'rgba(255,255,255,0.90)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="h-8 w-8 min-h-8 min-w-8"
            style={{ color: 'var(--text-muted)' } as React.CSSProperties}
          >
            <ZoomIn size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Zoom in</TooltipContent>
      </Tooltip>

      {/* Zoom percentage display */}
      <div className="flex items-center justify-center h-6 px-1">
        <span className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="h-8 w-8 min-h-8 min-w-8"
            style={{ color: 'var(--text-muted)' } as React.CSSProperties}
          >
            <ZoomOut size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Zoom out</TooltipContent>
      </Tooltip>

      <div className="w-full h-px my-0.5" style={{ background: 'var(--border-subtle)' }} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onFitToScreen}
            aria-label="Fit to screen"
            className="h-8 w-8 min-h-8 min-w-8"
            style={{ color: 'var(--text-muted)' } as React.CSSProperties}
          >
            <Maximize2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Fit to screen (double-click canvas)</TooltipContent>
      </Tooltip>
    </div>
  );
}
