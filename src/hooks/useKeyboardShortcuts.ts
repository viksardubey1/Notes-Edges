/**
 * Keyboard Shortcuts Hook — Notes & Edges
 *
 * Registers all global keyboard shortcuts for the graph workspace.
 * Must be mounted once at the workspace layout level.
 */

'use client';

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graph.store';
import { useUIStore } from '@/store/ui.store';

export function useKeyboardShortcuts(): void {
  const { clearSelection, toggleClusterMode, setMode } = useGraphStore();
  const {
    toggleSidebar,
    toggleFocusMode,
    openSearchPalette,
    openShortcutsOverlay,
    closeShortcutsOverlay,
    shortcutsOverlayOpen,
  } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      if (isInput) return;

      const isCmd = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'f':
        case 'F':
          if (!isCmd) {
            e.preventDefault();
            toggleFocusMode();
          }
          break;

        case 'c':
        case 'C':
          if (!isCmd) {
            e.preventDefault();
            toggleClusterMode();
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (shortcutsOverlayOpen) {
            closeShortcutsOverlay();
          } else {
            clearSelection();
          }
          break;

        case '?':
          e.preventDefault();
          openShortcutsOverlay();
          break;

        case '`':
          e.preventDefault();
          toggleSidebar();
          break;

        case 'b':
        case 'B':
          if (isCmd) {
            e.preventDefault();
            toggleSidebar();
          }
          break;

        case 'k':
        case 'K':
          if (isCmd) {
            e.preventDefault();
            openSearchPalette();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clearSelection,
    toggleClusterMode,
    toggleFocusMode,
    toggleSidebar,
    openSearchPalette,
    openShortcutsOverlay,
    closeShortcutsOverlay,
    shortcutsOverlayOpen,
  ]);
}
