'use client';

/**
 * ThemeProvider — applies the stored theme to the document root
 * and listens for system preference changes when theme === 'system'.
 */

import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme('system'); // re-resolve
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, setTheme]);

  return <>{children}</>;
}
