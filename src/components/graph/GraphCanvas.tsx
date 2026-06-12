/**
 * GraphCanvas — Notes & Edges
 *
 * Primary graph container.
 * - Drag-to-pan: mousedown + mousemove on canvas background
 * - Scroll-to-zoom: wheel event
 * - Auto fit-to-content on graph load
 * - Progressive disclosure overlay: shows concept count + "Reveal full map"
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { getLODLevel } from '@/lib/graph/lod';
import { shouldUseWebGL } from '@/lib/graph/physics';
import { Button } from '@/components/ui/button';
import { GraphControls } from './GraphControls';
import { BackgroundPicker } from './BackgroundPicker';
import { SVGRenderer } from './renderers/SVGRenderer';
import { ExplorationGuide } from './ExplorationGuide';
import { ConceptExpansion } from './ConceptExpansion';
import { GraphTips } from './GraphTips';
import { getBackdropOverlay } from '@/lib/backgrounds';
import { cn } from '@/lib/utils';

interface GraphCanvasProps {
  className?: string;
}

export function GraphCanvas({ className }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const prevGraphIdRef = useRef<string | null>(null);

  // Drag-to-pan state (refs so no re-render on every move)
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragOriginRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });

  const {
    graph, zoom, pan, mode, isGenerating,
    selectedNodeId, selectedEdgeId, backdropUrl,
  } = useGraphStore();
  const setPan = useGraphStore((s) => s.setPan);
  const hasSelection = !!(selectedNodeId || selectedEdgeId);

  // Second-degree edge expansion — lives here so the button can be placed
  // ergonomically in the canvas overlay, not floating over the selected node.
  const [showSecondDegree, setShowSecondDegree] = useState(false);
  useEffect(() => { setShowSecondDegree(false); }, [selectedNodeId]);

  // Background picker
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const {
    handleNodeClick,
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleZoom,
    handleZoomIn,
    handleZoomOut,
    fitToContent,
    handleExitNeighborhoodMode,
  } = useGraphInteractions();

  const lodLevel = getLODLevel(zoom);
  const nodeCount = graph?.nodes.length ?? 0;
  const useWebGL = shouldUseWebGL(nodeCount);

  // Keep panRef in sync for drag calculations
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Reset layout-ready when a new graph arrives
  useEffect(() => {
    if (!graph) return;
    if (graph.id !== prevGraphIdRef.current) {
      setIsLayoutReady(false);
    }
  }, [graph?.id]);

  // Auto fit-to-content on new graph, then mark layout ready
  useEffect(() => {
    if (!graph || dimensions.width === 0 || dimensions.height === 0) return;
    if (graph.id === prevGraphIdRef.current) return;
    prevGraphIdRef.current = graph.id;
    const t = setTimeout(() => {
      fitToContent(dimensions);
      // Extra settle time for the camera animation to complete before revealing
      setTimeout(() => setIsLayoutReady(true), 400);
    }, 100);
    return () => clearTimeout(t);
  }, [graph?.id, dimensions, fitToContent]);


  // ── Drag-to-pan handlers ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't intercept clicks on interactive elements overlaid on the canvas
    const target = e.target as Element;
    if (target.closest?.('button, [role="button"], a')) return;
    e.preventDefault(); // prevent browser text-selection on click/pan

    isDraggingRef.current = true;
    didDragRef.current = false;
    setIsDragging(true);
    dragOriginRef.current = {
      mx: e.clientX,
      my: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragOriginRef.current) return;
    const dx = e.clientX - dragOriginRef.current.mx;
    const dy = e.clientY - dragOriginRef.current.my;
    // Mark as a real drag once movement exceeds threshold
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
    setPan({ x: dragOriginRef.current.px + dx, y: dragOriginRef.current.py + dy });
  }, [setPan]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    dragOriginRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    dragOriginRef.current = null;
  }, []);

  // Suppress deselect-click when user was dragging
  const handleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    handleCanvasClick();
  }, [handleCanvasClick]);

  const handleDoubleClick = useCallback(() => {
    if (didDragRef.current) return;
    handleCanvasDoubleClick();
  }, [handleCanvasDoubleClick]);

  const handleScroll = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      handleZoom(zoom * delta);
    },
    [zoom, handleZoom],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden',
        'select-none',
        className,
      )}
      style={{
        background: backdropUrl
          ? (backdropUrl.startsWith('#') ? backdropUrl : '#111111')
          : 'radial-gradient(ellipse 90% 75% at 48% 42%, rgba(255,155,140,0.18) 0%, rgba(255,200,190,0.10) 45%, transparent 65%), radial-gradient(ellipse 60% 55% at 75% 75%, rgba(255,180,170,0.08) 0%, transparent 55%), #FEF8F7',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'background 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleScroll}
      role="application"
      aria-label="Knowledge graph canvas"
      tabIndex={0}
    >
      {/* Subtle dot-grid — hidden when backdrop image is active */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: backdropUrl ? 0 : hasSelection ? 0.30 : 0.55, transition: 'opacity 400ms ease' }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(123,110,196,0.22)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Backdrop — image or solid color, sits below everything */}
      {backdropUrl && !backdropUrl.startsWith('#') && (
        <motion.div
          key={backdropUrl}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
        </motion.div>
      )}
      {/* Readability overlay — softens backdrop so nodes/labels stay legible */}
      {backdropUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: getBackdropOverlay(backdropUrl) ?? undefined,
            transition: 'background 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Polar reference grid — hidden when backdrop image is active */}
      {dimensions.width > 0 && !backdropUrl && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: hasSelection ? 0.3 : 0.7, transition: 'opacity 500ms ease', zIndex: 0 }}
          aria-hidden="true"
        >
          {(() => {
            const cx = dimensions.width * 0.5;
            const cy = dimensions.height * 0.52;
            const maxR = Math.hypot(dimensions.width, dimensions.height) * 0.55;
            const rings = [0.22, 0.40, 0.60, 0.82].map((f) => f * maxR);
            const spokes = 8;
            return (
              <g>
                {/* Concentric dashed circles */}
                {rings.map((r, i) => (
                  <circle
                    key={`ring-${i}`}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke="rgba(123,110,196,0.10)"
                    strokeWidth={0.8}
                    strokeDasharray={i % 2 === 0 ? '4 8' : '1 10'}
                  />
                ))}
                {/* Radial spokes */}
                {Array.from({ length: spokes }).map((_, i) => {
                  const angle = (i / spokes) * Math.PI * 2 - Math.PI / 8;
                  return (
                    <line
                      key={`spoke-${i}`}
                      x1={cx} y1={cy}
                      x2={cx + Math.cos(angle) * maxR}
                      y2={cy + Math.sin(angle) * maxR}
                      stroke="rgba(123,110,196,0.05)"
                      strokeWidth={0.7}
                    />
                  );
                })}
                {/* Center focal point — tiny dot */}
                <circle cx={cx} cy={cy} r={2} fill="rgba(123,110,196,0.18)" />
                <circle cx={cx} cy={cy} r={6} fill="none" stroke="rgba(123,110,196,0.08)" strokeWidth={0.7} />
              </g>
            );
          })()}
        </svg>
      )}

      {/* Grain texture — hidden when backdrop image is active */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: backdropUrl ? 0 : 0.016, zIndex: 1, mixBlendMode: 'multiply' }}
        aria-hidden="true"
      >
        <filter id="grain-filter" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" />
      </svg>

      {/* Depth vignette — hidden when backdrop image is active */}
      {!backdropUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 58% at 50% 50%, transparent 25%, rgba(245,243,251,0.30) 72%, rgba(238,234,248,0.55) 100%)',
            zIndex: 2,
            transition: 'opacity 400ms ease',
            opacity: hasSelection ? 0.5 : 1,
          }}
          aria-hidden="true"
        />
      )}

      {/* Graph Renderer — stays alive even when a node is selected */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        {graph && dimensions.width > 0 && (
          <>
            {!useWebGL && (
              <SVGRenderer
                graph={graph}
                zoom={zoom}
                pan={pan}
                lodLevel={lodLevel}
                dimensions={dimensions}
                showSecondDegree={showSecondDegree}
              />
            )}
            {useWebGL && (
              <div className="absolute inset-0 flex items-center justify-center text-[#8A7A9A] text-[13px]">
                WebGL renderer — {nodeCount} nodes
              </div>
            )}
          </>
        )}

        {/* Exploration Guide */}
        {graph && dimensions.width > 0 && (
          <ExplorationGuide graph={graph} zoom={zoom} pan={pan} dimensions={dimensions} onNodeClick={handleNodeClick} />
        )}
      </div>

      {/* Tether — animated curve connecting selected node to the knowledge panel */}
      {selectedNodeId && dimensions.width > 0 && (() => {
        const selNode = graph?.nodes.find((n) => n.id === selectedNodeId);
        if (!selNode || selNode.x == null || selNode.y == null) return null;
        const nodeScreenX = dimensions.width / 2 + pan.x + selNode.x * zoom;
        const nodeScreenY = dimensions.height / 2 + pan.y + selNode.y * zoom;
        const panelWidth = Math.min(440, dimensions.width * 0.38);
        const panelLeft = dimensions.width - 20 - panelWidth;
        const accent = selNode.clusterColor ?? '#7B6EC4';
        const cp1x = nodeScreenX + (panelLeft - nodeScreenX) * 0.35;
        const cp2x = nodeScreenX + (panelLeft - nodeScreenX) * 0.65;
        const d = `M ${nodeScreenX} ${nodeScreenY} C ${cp1x} ${nodeScreenY}, ${cp2x} ${nodeScreenY}, ${panelLeft} ${nodeScreenY}`;
        return (
          <svg
            key="tether"
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 25, overflow: 'visible', opacity: 1 }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="tether-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {/* Tether line */}
            <path
              id="tether-path"
              d={d}
              stroke={`url(#tether-grad)`}
              strokeWidth="1.2"
              fill="none"
            />
            {/* Flowing particle */}
            <circle r="2.5" fill={accent} opacity="0.75">
              <animateMotion dur="2.2s" repeatCount="indefinite">
                <mpath href="#tether-path" />
              </animateMotion>
            </circle>
          </svg>
        );
      })()}

      {/* ConceptExpansion — spatial right-side knowledge panel */}
      <ConceptExpansion />

      {/* Graph Tips — ephemeral onboarding overlay */}
      <GraphTips graphId={graph?.id} isLayoutReady={isLayoutReady} />

      {/* Loading overlay — skeleton graph while generating or layout settling */}
      <AnimatePresence>
        {(isGenerating || (graph && !isLayoutReady)) && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--bg-base)', zIndex: 40 }}
          >
            {/* Skeleton graph — placeholder nodes + edges */}
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              {/* Skeleton edges */}
              {[
                [180, 220, 380, 180], [380, 180, 520, 320], [180, 220, 300, 400],
                [300, 400, 520, 320], [520, 320, 680, 240], [380, 180, 600, 140],
                [300, 400, 500, 460], [680, 240, 740, 400],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={`e${i}`} x1={`${(x1 / 900) * 100}%`} y1={`${(y1 / 600) * 100}%`}
                  x2={`${(x2 / 900) * 100}%`} y2={`${(y2 / 600) * 100}%`}
                  stroke="#E5E1F4" strokeWidth={1.5} className="animate-[shimmer-opacity_2.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
              {/* Skeleton nodes */}
              {[
                [180, 220, 18], [380, 180, 24], [520, 320, 20], [300, 400, 16],
                [680, 240, 14], [600, 140, 12], [500, 460, 13], [740, 400, 11],
                [140, 370, 10], [420, 80, 11],
              ].map(([cx, cy, r], i) => (
                <circle key={`n${i}`} cx={`${(cx / 900) * 100}%`} cy={`${(cy / 600) * 100}%`}
                  r={r} fill="#EEEAF8" className="animate-[shimmer-opacity_2.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
              {/* Skeleton labels */}
              {[
                [380, 215, 60], [520, 350, 48], [180, 248, 44], [680, 266, 36],
              ].map(([x, y, w], i) => (
                <rect key={`l${i}`} x={`${((x - w / 2) / 900) * 100}%`} y={`${(y / 600) * 100}%`}
                  width={w} height={8} rx={4} fill="#E5E1F4" opacity={0.6}
                  className="animate-[shimmer-opacity_2.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </svg>

            {/* Status text */}
            <div className="absolute inset-x-0 bottom-16 flex justify-center">
              <p className="text-[13px] font-light tracking-wide animate-[shimmer-opacity_2.4s_ease-in-out_infinite]"
                style={{ color: 'var(--text-muted)' }}>
                {isGenerating ? 'Mapping your ideas…' : 'Arranging your graph…'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!graph && !isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="flex flex-col items-center gap-4 max-w-[380px] text-center px-8">
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center ambient-float"
              style={{
                background: 'rgba(123, 110, 196, 0.07)',
                border: '1px solid rgba(123, 110, 196, 0.20)',
                boxShadow: '0 4px 24px rgba(123, 110, 196, 0.10)',
              }}
            >
              <Compass size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <p
              className="text-[26px] font-light leading-snug tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Your ideas are waiting<br />to be connected.
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Upload your notes and watch your understanding take shape — AI will map the concepts and reveal how they connect.
            </p>
          </div>
        </div>
      )}

      {/* Neighborhood Mode Back Button */}
      <AnimatePresence>
        {mode === 'neighborhood' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-4 z-10"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitNeighborhoodMode}
              className="gap-2"
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.90)',
                border: '1px solid rgba(123, 110, 196, 0.14)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowLeft size={14} />
              Back to full view
            </Button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Expand neighborhood — fixed bottom-left, ergonomic and consistent */}
      <AnimatePresence>
        {selectedNodeId && !showSecondDegree && (
          <motion.div
            key="expand-neighborhood"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-4 left-4 z-10"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowSecondDegree(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(107,88,192,0.20)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '12px',
                fontFamily: 'Geist, system-ui, sans-serif',
                fontWeight: '500',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(107,88,192,0.12)',
                letterSpacing: '0.01em',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.7 }}>
                <circle cx="6" cy="6" r="2" fill="currentColor" />
                <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="10" cy="2" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="2" cy="10" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.6" />
                <line x1="6" y1="6" x2="2" y2="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="6" y1="6" x2="10" y2="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="6" y1="6" x2="2" y2="10" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
              </svg>
              Expand neighborhood
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <GraphControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={() => fitToContent(dimensions)}
          onOpenPicker={() => setIsPickerOpen(true)}
        />
      </div>

      {/* Background Picker Modal */}
      <BackgroundPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
      />
    </div>
  );
}
