/**
 * UI Type Definitions — Notes & Edges
 */

// ─── Layout ───────────────────────────────────────────────────────────────────

export interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Panels
  nodeDetailOpen: boolean;
  uploadSheetOpen: boolean;
  searchPaletteOpen: boolean;
  shortcutsOverlayOpen: boolean;

  // Focus mode (F key)
  focusModeActive: boolean;

  // Breakpoint
  breakpoint: Breakpoint;

  // Node detail panel width (resizable)
  nodeDetailWidth: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setNodeDetailWidth: (width: number) => void;
  openNodeDetail: () => void;
  closeNodeDetail: () => void;
  openUploadSheet: () => void;
  closeUploadSheet: () => void;
  openSearchPalette: () => void;
  closeSearchPalette: () => void;
  toggleFocusMode: () => void;
  openShortcutsOverlay: () => void;
  closeShortcutsOverlay: () => void;
  setBreakpoint: (bp: Breakpoint) => void;
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

// ─── Project / Dashboard ──────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export type UploadSourceType = 'pdf' | 'text' | 'url';

export interface UploadState {
  file: File | null;
  text: string;
  url: string;
  activeTab: UploadSourceType;
  charCount: number;
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

export interface KeyboardShortcut {
  key: string;
  modifiers?: Array<'cmd' | 'shift' | 'alt' | 'ctrl'>;
  description: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'f', description: 'Toggle Focus Mode', action: 'toggleFocusMode' },
  { key: 'c', description: 'Toggle Cluster Reveal Mode', action: 'toggleClusterMode' },
  { key: 'Escape', description: 'Deselect / Exit current mode', action: 'clearSelection' },
  { key: '?', description: 'Open keyboard shortcuts overlay', action: 'openShortcutsOverlay' },
  { key: '`', description: 'Toggle sidebar', action: 'toggleSidebar-backtick' },
  { key: 'b', modifiers: ['cmd'], description: 'Toggle sidebar', action: 'toggleSidebar-cmd' },
  { key: 'k', modifiers: ['cmd'], description: 'Open semantic search', action: 'openSearchPalette' },
];

// ─── Toast / Notifications ────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────

export interface NodeDetailSection {
  id: string;
  title: string;
  collapsed: boolean;
}
