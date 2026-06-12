/**
 * useStableLoading — Notes & Edges
 *
 * Prevents skeleton flicker by:
 * 1. Delaying appearance — skips skeleton for fast loads (< delay ms)
 * 2. Enforcing minimum display — once visible, stays for at least minDuration ms
 * 3. Providing a fade phase — `phase` transitions "idle" → "skeleton" → "fading" → "idle"
 *
 * Usage:
 *   const { showSkeleton, phase } = useStableLoading(isLoading, { delay: 200, minDuration: 600, fadeDuration: 250 });
 *   // showSkeleton: boolean — render skeleton when true
 *   // phase: 'idle' | 'skeleton' | 'fading' — use for crossfade transitions
 */

import { useState, useEffect, useRef } from 'react';

interface StableLoadingOptions {
  /** Ms to wait before showing skeleton (default 200). */
  delay?: number;
  /** Minimum ms the skeleton stays visible once shown (default 600). */
  minDuration?: number;
  /** Ms for the fade-out transition (default 250). */
  fadeDuration?: number;
}

type LoadingPhase = 'idle' | 'skeleton' | 'fading';

interface StableLoadingResult {
  /** True during 'skeleton' and 'fading' phases — render skeleton markup. */
  showSkeleton: boolean;
  /** Current phase for crossfade styling. */
  phase: LoadingPhase;
}

export function useStableLoading(
  isLoading: boolean,
  options?: StableLoadingOptions,
): StableLoadingResult {
  const { delay = 200, minDuration = 600, fadeDuration = 250 } = options ?? {};

  const [phase, setPhase] = useState<LoadingPhase>('idle');
  const shownAtRef = useRef<number>(0);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const minTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isLoading) {
      // Loading started — schedule skeleton appearance after delay
      if (phase === 'idle') {
        clearTimeout(fadeTimerRef.current);
        delayTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          setPhase('skeleton');
        }, delay);
      }
    } else {
      // Loading ended
      clearTimeout(delayTimerRef.current);

      if (phase === 'skeleton') {
        // Enforce minimum display time
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, minDuration - elapsed);
        clearTimeout(minTimerRef.current);
        minTimerRef.current = setTimeout(() => {
          setPhase('fading');
          fadeTimerRef.current = setTimeout(() => setPhase('idle'), fadeDuration);
        }, remaining);
      } else if (phase === 'fading') {
        // Already fading out, let it finish
      } else {
        // Still in delay period — data arrived fast, never show skeleton
        setPhase('idle');
      }
    }

    return () => {
      clearTimeout(delayTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(delayTimerRef.current);
      clearTimeout(minTimerRef.current);
      clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return {
    showSkeleton: phase === 'skeleton' || phase === 'fading',
    phase,
  };
}
