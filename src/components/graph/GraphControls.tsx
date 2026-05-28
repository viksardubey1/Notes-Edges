/**
 * GraphControls — Notes & Edges
 *
 * Zoom controls: +, -, fit-to-screen, backdrop image picker.
 * Position: bottom-right corner of the graph canvas.
 */

'use client';

import { useRef } from 'react';
import { Minus, Plus, Maximize2, ImagePlus, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGraphStore } from '@/store/graph.store';

interface GraphControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

export function GraphControls({ zoom, onZoomIn, onZoomOut, onFitToScreen }: GraphControlsProps) {
  const { backdropUrl, setBackdrop, graph } = useGraphStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) setBackdrop(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const btnClass = "flex items-center justify-center rounded-[7px] transition-colors duration-100 hover:bg-black/5 active:bg-black/8";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      <div
        className="flex flex-col rounded-[12px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--card-shadow)',
          width: 88,
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

            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label={backdropUrl ? 'Change backdrop image' : 'Set backdrop image'}
              className="flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-100 hover:bg-black/5"
              style={{ color: backdropUrl ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
              <ImagePlus size={12} />
              <span className="text-[11px]">Backdrop</span>
            </button>

            {backdropUrl && (
              <>
                <div className="h-px mx-2" style={{ background: 'var(--border-subtle)' }} />
                <button
                  onClick={() => setBackdrop(null)}
                  aria-label="Remove backdrop"
                  className="flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-100 hover:bg-black/5"
                  style={{ color: 'var(--accent-warm)' }}
                >
                  <X size={12} />
                  <span className="text-[11px]">Remove</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
