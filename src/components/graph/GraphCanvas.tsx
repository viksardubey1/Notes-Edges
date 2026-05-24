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
import { ArrowLeft, Compass, Map } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { getLODLevel } from '@/lib/graph/lod';
import { shouldUseWebGL } from '@/lib/graph/physics';
import { Button } from '@/components/ui/button';
import { GraphControls } from './GraphControls';
import { SVGRenderer } from './renderers/SVGRenderer';
import { ExplorationGuide } from './ExplorationGuide';
import { ConceptExpansion } from './ConceptExpansion';
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
    progressiveMode, revealedNodeIds, showFullGraph,
    selectedNodeId, selectedEdgeId,
  } = useGraphStore();
  const setPan = useGraphStore((s) => s.setPan);
  const revealedCount = revealedNodeIds?.size ?? (graph?.nodes.length ?? 0);
  const hasSelection = !!(selectedNodeId || selectedEdgeId);

  const {
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

  // Re-fit when progressive mode reveals more nodes
  useEffect(() => {
    if (!progressiveMode || dimensions.width === 0) return;
    const t = setTimeout(() => fitToContent(dimensions), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCount]);

  // ── Drag-to-pan handlers ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // prevent browser text-selection on click/pan
    // Don't start pan drag when pressing on an interactive node
    const target = e.target as Element;
    if (target.closest?.('[role="button"]')) return;

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
        background: 'radial-gradient(ellipse 100% 80% at 50% 0%, #1A0F38 0%, #0C0818 45%, #080514 100%)',
        cursor: isDragging ? 'grabbing' : 'grab',
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
      {/* Star-field dot-grid — cosmic spatial orientation */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: hasSelection ? 0.08 : 0.18, transition: 'opacity 400ms ease' }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.9)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Atmospheric nebula glows — warm, spatial, cinematic */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          opacity: hasSelection ? 0.4 : 1,
          transition: 'opacity 400ms ease',
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, rgba(152,118,238,0.10) 0%, transparent 65%),
            radial-gradient(ellipse 50% 42% at 85% 72%, rgba(80,208,160,0.07) 0%, transparent 65%),
            radial-gradient(ellipse 42% 35% at 72% 12%, rgba(240,112,144,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 38% 30% at 48% 90%, rgba(80,192,232,0.06) 0%, transparent 58%),
            radial-gradient(ellipse 30% 25% at 30% 60%, rgba(192,96,232,0.05) 0%, transparent 55%)
          `,
        }}
        aria-hidden="true"
      />

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
          <ExplorationGuide graph={graph} zoom={zoom} pan={pan} dimensions={dimensions} />
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
        const accent = selNode.clusterColor ?? '#9876EE';
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

      {/* Loading overlay — shown while generating OR while layout is settling */}
      <AnimatePresence>
        {(isGenerating || (graph && !isLayoutReady)) && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 100% 80% at 50% 0%, #1A0F38 0%, #0C0818 45%, #080514 100%)',
              zIndex: 40,
            }}
          >
            {/* Orbital rings */}
            <div className="relative flex items-center justify-center w-28 h-28">
              {/* Outer ring — slow clockwise */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '1.5px solid rgba(152,118,238,0.12)',
                  borderTopColor: 'rgba(152,118,238,0.75)',
                  borderRightColor: 'rgba(152,118,238,0.30)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              {/* Middle ring — counter-clockwise, different color */}
              <motion.div
                className="absolute w-[72px] h-[72px] rounded-full"
                style={{
                  border: '1px solid rgba(80,208,160,0.08)',
                  borderBottomColor: 'rgba(80,208,160,0.55)',
                  borderLeftColor: 'rgba(80,208,160,0.22)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
              />
              {/* Inner ring — clockwise, accent */}
              <motion.div
                className="absolute w-10 h-10 rounded-full"
                style={{
                  border: '1px solid rgba(240,112,144,0.08)',
                  borderTopColor: 'rgba(240,112,144,0.40)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              {/* Center orb */}
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: '0 0 18px rgba(152,118,238,0.9)',
                }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* Status text */}
            <motion.p
              className="mt-8 text-[13px] font-light tracking-wide"
              style={{ color: 'var(--text-muted)' }}
              animate={{ opacity: [0.4, 0.75, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isGenerating ? 'Mapping your ideas…' : 'Building your universe…'}
            </motion.p>
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
                background: 'rgba(152, 118, 238, 0.08)',
                border: '1px solid rgba(152, 118, 238, 0.25)',
                boxShadow: '0 4px 32px rgba(152, 118, 238, 0.15)',
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

      {/* Progressive Disclosure Banner */}
      <AnimatePresence>
        {graph && progressiveMode && revealedNodeIds && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2.5 rounded-full pointer-events-auto"
            style={{
              background: 'rgba(14, 10, 30, 0.88)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Exploring {revealedNodeIds.size} of {graph.nodes.length} concepts
              </span>
            </div>
            <div className="w-px h-3" style={{ background: 'var(--border-default)' }} />
            <button
              onClick={showFullGraph}
              className="flex items-center gap-1 text-[11px] font-medium transition-colors"
              style={{ color: 'var(--accent-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-bright)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
            >
              <Map size={10} />
              Reveal full map
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                background: 'rgba(20, 16, 40, 0.85)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowLeft size={14} />
              Back to full view
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas hint */}
      {graph && !isDragging && !progressiveMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="text-[11px] select-none" style={{ color: 'rgba(168,152,200,0.55)' }}>
            Drag to pan · Scroll to zoom · Click any concept or connection to explore
          </p>
        </div>
      )}
      {graph && progressiveMode && !isDragging && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="text-[11px] select-none" style={{ color: 'rgba(168,152,200,0.55)' }}>
            Click any concept to explore its connections
          </p>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <GraphControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={() => fitToContent(dimensions)}
        />
      </div>
    </div>
  );
}
