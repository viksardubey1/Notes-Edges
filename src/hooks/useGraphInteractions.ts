/**
 * Graph Interaction Hook — Notes & Edges
 *
 * Encapsulates all graph canvas interaction logic:
 * - Node click: select + smooth camera pan to center node + reveal neighbours (progressive mode)
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

export function useGraphInteractions() {
  const {
    graph,
    selectedNodeId,
    zoom,
    progressiveMode,
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
    revealNode,
  } = useGraphStore();

  const { openNodeDetail, closeNodeDetail } = useUIStore();

  const handleNodeClick = useCallback(
    (nodeId: string, shiftKey = false): void => {
      if (shiftKey) { multiSelectNode(nodeId); return; }
      if (selectedNodeId === nodeId) { clearSelection(); return; }

      selectNode(nodeId);
      // Close edge panel if it was open; node detail is handled by ConceptExpansion overlay
      closeNodeDetail();

      // Progressive disclosure: reveal this node + its top neighbours
      if (progressiveMode) {
        revealNode(nodeId);
      }

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
    [selectedNodeId, graph, zoom, progressiveMode, selectNode, clearSelection, multiSelectNode, closeNodeDetail, setPan, revealNode],
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
    setZoom(1);
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
    handleZoom(zoom * 1.25);
  }, [zoom, handleZoom]);

  const handleZoomOut = useCallback((): void => {
    handleZoom(zoom / 1.25);
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
