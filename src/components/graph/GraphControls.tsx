/**
 * GraphControls — Notes & Edges
 *
 * Zoom controls: +, -, fit-to-screen, and background theme picker.
 * Position: bottom-right corner of the graph canvas.
 */

'use client';

import { Minus, Plus, Maximize2, ImagePlus, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGraphStore } from '@/store/graph.store';

// Note: Tooltip still used for zoom-in/out/fit buttons above

interface GraphControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onOpenPicker: () => void;
}

export function GraphControls({ zoom, onZoomIn, onZoomOut, onFitToScreen, onOpenPicker }: GraphControlsProps) {
  const { backdropUrl, setBackdrop, graph } = useGraphStore();

  const btnClass = "flex items-center justify-center rounded-[7px] transition-colors duration-100 hover:bg-black/5 active:bg-black/8";

  return (
    <div
      className="flex flex-col rounded-[12px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--card-shadow)',
        width: 96,
      }}
    >
      {/* Zoom row: − [pct] + */}
      <div className="flex items-center gap-0 px-1.5 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomOut}
              aria-label="Zoom out"
              className={`${btnClass} h-6 w-6`}
              style={{ color: 'var(--text-muted)' }}
            >
              <Minus size={11} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom out</TooltipContent>
        </Tooltip>

        <span
          className="flex-1 text-center text-[11px] tabular-nums font-medium select-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onZoomIn}
              aria-label="Zoom in"
              className={`${btnClass} h-6 w-6`}
              style={{ color: 'var(--text-muted)' }}
            >
              <Plus size={11} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom in</TooltipContent>
        </Tooltip>
      </div>

      <div className="h-px mx-2" style={{ background: 'var(--border-subtle)' }} />

      {/* Fit to screen */}
      <button
        onClick={onFitToScreen}
        aria-label="Fit to screen"
        className="flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-100 hover:bg-black/5"
        style={{ color: 'var(--text-muted)' }}
      >
        <Maximize2 size={12} />
        <span className="text-[11px]">Fit view</span>
      </button>

      {graph && (
        <>
          <div className="h-px mx-2" style={{ background: 'var(--border-subtle)' }} />

          {/* Background picker button */}
          <button
            onClick={onOpenPicker}
            aria-label="Choose background"
            className="flex items-center gap-2 mx-1.5 my-1.5 px-2 py-1.5 rounded-[8px] transition-all duration-150"
            style={{
              background: backdropUrl
                ? 'rgba(123,110,196,0.12)'
                : 'linear-gradient(135deg, rgba(123,110,196,0.13) 0%, rgba(93,148,200,0.10) 100%)',
              border: '1px solid rgba(123,110,196,0.30)',
              color: 'var(--accent-primary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.20)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = backdropUrl
                ? 'rgba(123,110,196,0.12)'
                : 'linear-gradient(135deg, rgba(123,110,196,0.13) 0%, rgba(93,148,200,0.10) 100%)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.30)';
            }}
          >
            <ImagePlus size={13} />
            <span className="text-[11px] font-medium">Background</span>
          </button>

          {backdropUrl && (
            <button
              onClick={() => setBackdrop(null)}
              aria-label="Remove background"
              className="flex items-center gap-2 mx-1.5 mb-1.5 px-2 py-1 rounded-[6px] transition-colors duration-100 hover:bg-black/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={11} />
              <span className="text-[10px]">Remove</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
