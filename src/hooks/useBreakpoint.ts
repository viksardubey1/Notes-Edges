/**
 * Breakpoint Detection Hook — Notes & Edges
 *
 * Syncs the current viewport breakpoint to UIStore.
 * Mount once at the root layout level.
 */

'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';
import type { Breakpoint } from '@/types/ui';

const BREAKPOINTS: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 768,
  desktop: 1200,
  wide: 1800,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const { breakpoint, setBreakpoint } = useUIStore();

  useEffect(() => {
    const update = (): void => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [setBreakpoint]);

  return breakpoint;
}
