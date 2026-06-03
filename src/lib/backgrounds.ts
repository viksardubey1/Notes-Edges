/**
 * backgrounds.ts — Background Theme Registry
 *
 * Single source of truth for all built-in backgrounds, solid colors,
 * and user upload utilities.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type BackgroundTheme = 'light' | 'dark';

export type BackgroundCategory =
  | 'All'
  | 'Biology'
  | 'Medicine'
  | 'Physics'
  | 'Mathematics'
  | 'History'
  | 'Computer Science'
  | 'Solid Colors'
  | 'My Uploads';

export interface BuiltInBackground {
  id: string;
  name: string;
  url: string;
  category: Exclude<BackgroundCategory, 'Solid Colors' | 'My Uploads' | 'All'>;
  theme: BackgroundTheme;
}

export interface SolidColor {
  id: string;
  name: string;
  color: string; // hex
  theme: BackgroundTheme;
}

export interface UserUpload {
  id: string;
  name: string;
  url: string;         // full compressed data URL (applied to backdrop)
  thumbnailUrl: string; // smaller webp for the picker grid
  uploadedAt: string;
}

// ── Built-in backgrounds ──────────────────────────────────────────────────────

export const BUILT_IN_BACKGROUNDS: BuiltInBackground[] = [
  { id: 'bg-bio',      name: 'Biology',       url: '/backgrounds/bio.png',      category: 'Biology',          theme: 'light' },
  { id: 'bg-gene',     name: 'Genetics',      url: '/backgrounds/gene.png',     category: 'Biology',          theme: 'dark'  },
  { id: 'bg-medicine', name: 'Medicine',      url: '/backgrounds/medicine.png', category: 'Medicine',         theme: 'light' },
  { id: 'bg-physics',  name: 'Physics',       url: '/backgrounds/physics.png',  category: 'Physics',          theme: 'dark'  },
  { id: 'bg-space',    name: 'Space',         url: '/backgrounds/space.png',    category: 'Physics',          theme: 'dark'  },
  { id: 'bg-math',     name: 'Mathematics',   url: '/backgrounds/math.png',     category: 'Mathematics',      theme: 'dark'  },
  { id: 'bg-history',  name: 'History',       url: '/backgrounds/history.png',  category: 'History',          theme: 'light' },
  { id: 'bg-ai',       name: 'AI / Neural',   url: '/backgrounds/ai.png',       category: 'Computer Science', theme: 'dark'  },
];

// ── Solid colors ──────────────────────────────────────────────────────────────

export const SOLID_COLORS: SolidColor[] = [
  // Light
  { id: 'solid-warm-white',     name: 'Warm White',     color: '#FFFDF7', theme: 'light' },
  { id: 'solid-off-white',      name: 'Off White',      color: '#F9F7F4', theme: 'light' },
  { id: 'solid-soft-gray',      name: 'Soft Gray',      color: '#F2F2F2', theme: 'light' },
  { id: 'solid-light-lavender', name: 'Light Lavender', color: '#F0EDF9', theme: 'light' },
  { id: 'solid-light-purple',   name: 'Light Purple',   color: '#EDE8F7', theme: 'light' },
  { id: 'solid-pale-blue',      name: 'Pale Blue',      color: '#EBF2FB', theme: 'light' },
  { id: 'solid-sage-green',     name: 'Sage Green',     color: '#EDF4EE', theme: 'light' },
  { id: 'solid-soft-beige',     name: 'Soft Beige',     color: '#F5F0E8', theme: 'light' },
  // Dark
  { id: 'solid-midnight',       name: 'Midnight',       color: '#0A0A14', theme: 'dark'  },
  { id: 'solid-deep-navy',      name: 'Deep Navy',      color: '#0D1B2A', theme: 'dark'  },
  { id: 'solid-dark-purple',    name: 'Dark Purple',    color: '#130E22', theme: 'dark'  },
  { id: 'solid-charcoal',       name: 'Charcoal',       color: '#1A1A1A', theme: 'dark'  },
];

// ── Theme detection ───────────────────────────────────────────────────────────

/** Detect light/dark from the backdrop URL stored in the graph store. */
export function getBackgroundTheme(url: string | null): BackgroundTheme {
  if (!url) return 'light';

  // Solid color → detect brightness from hex
  if (url.startsWith('#') && url.length >= 7) {
    const r = parseInt(url.slice(1, 3), 16);
    const g = parseInt(url.slice(3, 5), 16);
    const b = parseInt(url.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? 'light' : 'dark';
  }

  // Built-in image → look up in registry
  const found = BUILT_IN_BACKGROUNDS.find((b) => b.url === url);
  if (found) return found.theme;

  // Custom upload → default to 'light' overlay (safe, unobtrusive)
  return 'light';
}

/**
 * Readability overlay color placed between backdrop and graph elements.
 * Light backgrounds get a soft white wash; dark backgrounds get a subtle dark veil.
 */
export function getBackdropOverlay(url: string | null): string | null {
  if (!url) return null;
  const theme = getBackgroundTheme(url);
  return theme === 'dark' ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.09)';
}

// ── User upload persistence ───────────────────────────────────────────────────

const USER_UPLOADS_KEY = 'ne_user_backgrounds';
const MAX_USER_UPLOADS = 20;

export function loadUserUploads(): UserUpload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_UPLOADS_KEY);
    return raw ? (JSON.parse(raw) as UserUpload[]) : [];
  } catch {
    return [];
  }
}

export function saveUserUpload(upload: UserUpload): UserUpload[] {
  const current = loadUserUploads();
  const updated = [upload, ...current].slice(0, MAX_USER_UPLOADS);
  try {
    localStorage.setItem(USER_UPLOADS_KEY, JSON.stringify(updated));
  } catch { /* quota exceeded — silently skip */ }
  return updated;
}

export function deleteUserUpload(id: string): UserUpload[] {
  const updated = loadUserUploads().filter((u) => u.id !== id);
  try {
    localStorage.setItem(USER_UPLOADS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
}

// ── Image utilities ───────────────────────────────────────────────────────────

/** Compress an uploaded image to a webp data URL, max 1920px wide. */
export function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not available')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/** Generate a small thumbnail webp for the picker grid. */
export function generateThumbnail(dataUrl: string, maxSize = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', 0.75));
    };
    img.onerror = () => reject(new Error('Thumbnail generation failed'));
    img.src = dataUrl;
  });
}

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  'All', 'Biology', 'Medicine', 'Physics', 'Mathematics',
  'History', 'Computer Science', 'Solid Colors', 'My Uploads',
];
