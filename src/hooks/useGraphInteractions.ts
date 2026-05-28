/**
 * Graph Interaction Hook — Notes & Edges
 *
 * Encapsulates all graph canvas interaction logic:
 * - Node click: select + smooth camera pan to center node
 * - Node double-click: Neighborhood Mode
 * - Canvas click: deselect
 * - Canvas double-click: reset view
 * - Zoom range: 0.1x–4x
 */

'use client';

import { useCallback, useRef } from 'react';
import { useGraphStore, getNeighborNodeIds } from '@/store/graph.store';
import { useUIStore } from '@/store/ui.store';
import { clamp } from '@/lib/utils';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

// Preset zoom levels for step-wise zoom in/out
const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.80, 0.90, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];

export function useGraphInteractions() {
  const {
    graph,
    selectedNodeId,
    zoom,
    selectNode,
    selectEdge,
    clearSelection,
    hoverNode,
    hoverEdge,
    setZoom,
    setPan,
    setMode,
    multiSelectNode,
    fitToContent,
  } = useGraphStore();

  const { openNodeDetail, closeNodeDetail } = useUIStore();

  // Remember zoom level before we zoomed in on a node, so we can restore it on deselect.
  const preNodeZoom = useRef<number | null>(null);

  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey = false): void => {
      if (shiftKey) { multiSelectNode(nodeId); return; }
      if (selectedNodeId === nodeId) { clearSelection(); return; }

      selectNode(nodeId);
      closeNodeDetail();

      const NODE_CLICK_ZOOM = 1.6;
      // Only save the pre-click zoom if we're actually going to zoom in.
      if (zoom < NODE_CLICK_ZOOM) {
        preNodeZoom.current = zoom;
      }
      const targetZoom = Math.max(zoom, NODE_CLICK_ZOOM);
      setZoom(targetZoom);

      if (graph) {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node && node.x != null && node.y != null) {
          setPan({
            x: -(node.x * targetZoom) - 220,
            y: -(node.y * targetZoom),
          });
        }
      }
    },
    [selectedNodeId, graph, zoom, selectNode, clearSelection, multiSelectNode, closeNodeDetail, setZoom, setPan],
  );

  // Navigate to a node without toggling selection or closing the detail panel.
  // Used by prev/next traversal buttons inside NodeDetailPanel.
  const navigateToNode = useCallback(
    (nodeId: string): void => {
      selectNode(nodeId);
      const NODE_CLICK_ZOOM = 1.6;
      const targetZoom = Math.max(zoom, NODE_CLICK_ZOOM);
      setZoom(targetZoom);
      if (graph) {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node && node.x != null && node.y != null) {
          setPan({
            x: -(node.x * targetZoom) - 220,
            y: -(node.y * targetZoom),
          });
        }
      }
    },
    [graph, zoom, selectNode, setZoom, setPan],
  );

  const handleNodeDoubleClick = useCallback(
    (nodeId: string): void => {
      selectNode(nodeId);
      setMode('neighborhood');
      // Close edge panel if it was open; node detail is handled by ConceptExpansion overlay
      closeNodeDetail();
    },
    [selectNode, setMode, closeNodeDetail],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string): void => {
      selectEdge(edgeId);
      openNodeDetail();
    },
    [selectEdge, openNodeDetail],
  );

  const handleCanvasClick = useCallback((): void => {
    clearSelection();
    closeNodeDetail();
    // Restore the zoom level we had before clicking a node.
    if (preNodeZoom.current !== null) {
      setZoom(preNodeZoom.current);
      preNodeZoom.current = null;
    }
  }, [clearSelection, closeNodeDetail, setZoom]);

  const handleCanvasDoubleClick = useCallback((): void => {
    setZoom(1.25);
    setPan({ x: 0, y: 0 });
    setMode('default');
  }, [setZoom, setPan, setMode]);

  const handleZoom = useCallback(
    (newZoom: number): void => {
      setZoom(clamp(newZoom, ZOOM_MIN, ZOOM_MAX));
    },
    [setZoom],
  );

  const handleZoomIn = useCallback((): void => {
    const next = ZOOM_LEVELS.find((l) => l > zoom + 0.001);
    handleZoom(next ?? ZOOM_MAX);
  }, [zoom, handleZoom]);

  const handleZoomOut = useCallback((): void => {
    const prev = [...ZOOM_LEVELS].reverse().find((l) => l < zoom - 0.001);
    handleZoom(prev ?? ZOOM_MIN);
  }, [zoom, handleZoom]);

  const handleFitToScreen = useCallback((): void => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  const handleExitNeighborhoodMode = useCallback((): void => {
    setMode('default');
    clearSelection();
  }, [setMode, clearSelection]);

  const neighborNodeIds = getNeighborNodeIds(graph, selectedNodeId);

  return {
    handleNodeClick,
    navigateToNode,
    handleNodeDoubleClick,
    handleEdgeClick,
    handleCanvasClick,
    handleCanvasDoubleClick,
    handleZoom,
    handleZoomIn,
    handleZoomOut,
    handleFitToScreen,
    handleExitNeighborhoodMode,
    hoverNode,
    hoverEdge,
    neighborNodeIds,
    fitToContent,
  };
}
