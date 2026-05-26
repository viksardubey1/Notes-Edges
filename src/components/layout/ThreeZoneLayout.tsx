/**
 * ThreeZoneLayout — Notes & Edges Core Layout
 *
 * The three permanent zones:
 * 1. Command Bar (top, 48px) — collapses in focus mode
 * 2. Context Sidebar (left, 280px) — collapses to 48px icon rail
 * 3. Graph Canvas (fills remaining space)
 *
 * Rules:
 * - Graph canvas is NEVER fully obscured.
 * - Canvas width: calc(100vw - sidebarWidth) — never percentage-based.
 * - Node detail panel (320px) slides in from right, pushing graph or overlapping per breakpoint.
 */

'use client';

import { useCallback, useRef } from 'react';
import { useUIStore } from '@/store/ui.store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { semantic } from '@/lib/tokens';

interface ThreeZoneLayoutProps {
  commandBar: React.ReactNode;
  sidebar: React.ReactNode;
  canvas: React.ReactNode;
  nodeDetailPanel?: React.ReactNode;
}

export function ThreeZoneLayout({
  commandBar,
  sidebar,
  canvas,
  nodeDetailPanel,
}: ThreeZoneLayoutProps) {
  useKeyboardShortcuts();
  useBreakpoint();

  const { sidebarWidth, focusModeActive, nodeDetailOpen, nodeDetailWidth, setNodeDetailWidth, breakpoint } = useUIStore();

  const panelWidth = nodeDetailOpen ? nodeDetailWidth : 0;

  // On desktop: node detail panel pushes the canvas. On tablet/mobile: overlaps.
  const pushesCanvas = breakpoint === 'desktop' || breakpoint === 'wide';
  const canvasRightOffset = pushesCanvas ? panelWidth : 0;

  // Drag-to-resize the node detail panel
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(nodeDetailWidth);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = nodeDetailWidth;

    const onMove = (mv: MouseEvent) => {
      // Dragging left increases width (panel is on the right)
      const delta = dragStartX.current - mv.clientX;
      setNodeDetailWidth(dragStartWidth.current + delta);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodeDetailWidth, setNodeDetailWidth]);

  return (
    <div className="relative flex flex-col w-screen h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Command Bar */}
      {!focusModeActive && (
        <div
          className="relative z-[55] flex-shrink-0"
          style={{ height: semantic.layout.commandBarHeight }}
        >
          {commandBar}
        </div>
      )}

      {/* Content Area: Sidebar + Canvas */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Context Sidebar */}
        {!focusModeActive && (
          <div
            className="relative z-20 flex-shrink-0 overflow-hidden"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>
        )}

        {/* Graph Canvas — fills remaining space */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            width: `calc(100% - ${canvasRightOffset}px)`,
            transition: 'width 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {canvas}
        </div>

        {/* Node Detail Panel */}
        {nodeDetailPanel && (
          <div
            className="absolute right-0 top-0 bottom-0 z-20 flex"
            style={{
              width: nodeDetailWidth,
              transform: nodeDetailOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 400ms ease',
              boxShadow: nodeDetailOpen
                ? '-16px 0 40px rgba(37,30,61,0.10), -1px 0 0 rgba(123,110,196,0.10)'
                : 'none',
            }}
          >
            {/* Drag handle */}
            <div
              onMouseDown={handleDragStart}
              className="absolute left-0 top-0 bottom-0 w-1 z-10 cursor-col-resize group/handle flex items-center justify-center"
              style={{ marginLeft: -2 }}
            >
              <div
                className="w-1 h-12 rounded-full opacity-0 group-hover/handle:opacity-100 transition-opacity"
                style={{ background: '#D4708A66' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {nodeDetailPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
