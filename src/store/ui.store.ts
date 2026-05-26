/**
 * UI Store — Notes & Edges
 *
 * Manages all UI panel/sidebar state. Separate from graph state.
 * Uses Jotai for atomic UI atoms where possible (imported via hooks).
 */

import { create } from 'zustand';
import type { UIState, Breakpoint } from '@/types/ui';
import { semantic } from '@/lib/tokens';

function getSidebarWidthForBreakpoint(bp: Breakpoint, open: boolean): number {
  if (!open) return semantic.layout.sidebarCollapsedWidth;
  if (bp === 'wide') return semantic.layout.sidebarWideWidth;
  if (bp === 'mobile' || bp === 'tablet') return semantic.layout.sidebarCollapsedWidth;
  return semantic.layout.sidebarWidth;
}

export const useUIStore = create<UIState>()((set, get) => ({
  // ─── Sidebar ────────────────────────────────────────────────────────────────
  sidebarOpen: true,
  sidebarWidth: semantic.layout.sidebarWidth,

  // ─── Panels ─────────────────────────────────────────────────────────────────
  nodeDetailWidth: 560,
  nodeDetailOpen: false,
  uploadSheetOpen: false,
  searchPaletteOpen: false,
  shortcutsOverlayOpen: false,

  // ─── Focus Mode ─────────────────────────────────────────────────────────────
  focusModeActive: false,

  // ─── Breakpoint ─────────────────────────────────────────────────────────────
  breakpoint: 'desktop',

  // ─── Actions ────────────────────────────────────────────────────────────────

  toggleSidebar: () =>
    set((state) => {
      const open = !state.sidebarOpen;
      return {
        sidebarOpen: open,
        sidebarWidth: getSidebarWidthForBreakpoint(state.breakpoint, open),
      };
    }),

  setSidebarOpen: (open: boolean) =>
    set((state) => ({
      sidebarOpen: open,
      sidebarWidth: getSidebarWidthForBreakpoint(state.breakpoint, open),
    })),

  setNodeDetailWidth: (width: number) => set({ nodeDetailWidth: Math.max(320, Math.min(740, width)) }),
  openNodeDetail: () => set({ nodeDetailOpen: true }),
  closeNodeDetail: () => set({ nodeDetailOpen: false }),

  openUploadSheet: () => set({ uploadSheetOpen: true }),
  closeUploadSheet: () => set({ uploadSheetOpen: false }),

  openSearchPalette: () => set({ searchPaletteOpen: true }),
  closeSearchPalette: () => set({ searchPaletteOpen: false }),

  toggleFocusMode: () =>
    set((state) => ({
      focusModeActive: !state.focusModeActive,
      // In focus mode: collapse sidebar, close panels
      sidebarOpen: state.focusModeActive ? state.sidebarOpen : false,
      nodeDetailOpen: state.focusModeActive ? state.nodeDetailOpen : false,
    })),

  openShortcutsOverlay: () => set({ shortcutsOverlayOpen: true }),
  closeShortcutsOverlay: () => set({ shortcutsOverlayOpen: false }),

  setBreakpoint: (breakpoint: Breakpoint) =>
    set((state) => {
      const sidebarOpen =
        breakpoint === 'mobile'
          ? false
          : breakpoint === 'tablet'
            ? false
            : state.sidebarOpen;
      return {
        breakpoint,
        sidebarOpen,
        sidebarWidth: getSidebarWidthForBreakpoint(breakpoint, sidebarOpen),
      };
    }),
}));
