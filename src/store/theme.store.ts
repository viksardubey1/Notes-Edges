import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ColorPreset = 'midnight-rose' | 'forest-night' | 'ocean-deep' | 'golden-hour' | 'lavender-dusk';

interface ThemeState {
  theme: ThemeMode;
  colorPreset: ColorPreset;
  setTheme: (theme: ThemeMode) => void;
  setColorPreset: (preset: ColorPreset) => void;
  resolvedTheme: 'dark' | 'light';
}

const STORAGE_KEY = 'ne_theme';
const PRESET_STORAGE_KEY = 'ne_color_preset';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') return getSystemTheme();
  return mode;
}

function loadStored(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'light';
}

function loadStoredPreset(): ColorPreset {
  if (typeof window === 'undefined') return 'midnight-rose';
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY) as ColorPreset | null;
    const valid: ColorPreset[] = ['midnight-rose', 'forest-night', 'ocean-deep', 'golden-hour', 'lavender-dusk'];
    if (stored && valid.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'midnight-rose';
}

function applyPreset(preset: ColorPreset, resolvedTheme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  // Only apply color presets in dark mode; light mode uses its own variables
  if (resolvedTheme === 'light') {
    document.documentElement.removeAttribute('data-preset');
  } else if (preset === 'midnight-rose') {
    document.documentElement.removeAttribute('data-preset');
  } else {
    document.documentElement.setAttribute('data-preset', preset);
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = loadStored();
  const initialPreset = loadStoredPreset();
  const initialResolved = resolve(initial);

  // Apply on init
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialResolved);
    applyPreset(initialPreset, initialResolved);
  }

  return {
    theme: initial,
    colorPreset: initialPreset,
    resolvedTheme: initialResolved,
    setTheme: (theme) => {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
      const resolved = resolve(theme);
      set((s) => {
        applyPreset(s.colorPreset, resolved);
        return { theme, resolvedTheme: resolved };
      });
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
      }
    },
    setColorPreset: (preset) => {
      try { localStorage.setItem(PRESET_STORAGE_KEY, preset); } catch { /* ignore */ }
      set((s) => {
        applyPreset(preset, s.resolvedTheme);
        return { colorPreset: preset };
      });
    },
  };
});
