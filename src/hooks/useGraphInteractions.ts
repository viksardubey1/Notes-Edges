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

import { useCallback } from 'react';
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

  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey = false): void => {
      if (shiftKey) { multiSelectNode(nodeId); return; }
      if (selectedNodeId === nodeId) { clearSelection(); return; }

      selectNode(nodeId);
      // Close edge panel if it was open; node detail is handled by ConceptExpansion overlay
      closeNodeDetail();

      // Smooth camera pan: center the selected node in the viewport.
      if (graph) {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node && node.x != null && node.y != null) {
          // Offset -220px so node sits left of center, giving the right panel space.
          setPan({
            x: -(node.x * zoom) - 220,
            y: -(node.y * zoom),
          });
        }
      }
    },
    [selectedNodeId, graph, zoom, selectNode, clearSelection, multiSelectNode, closeNodeDetail, setPan],
  );

  // Navigate to a node without toggling selection or closing the detail panel.
  // Used by prev/next traversal buttons inside NodeDetailPanel.
  const navigateToNode = useCallback(
    (nodeId: string): void => {
      selectNode(nodeId);
      if (graph) {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node && node.x != null && node.y != null) {
          setPan({
            x: -(node.x * zoom) - 220,
            y: -(node.y * zoom),
          });
        }
      }
    },
    [graph, zoom, selectNode, setPan],
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
  }, [clearSelection]);

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
