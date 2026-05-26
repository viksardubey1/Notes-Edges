'use client';

/**
 * AuthGuard — Notes & Edges
 *
 * Reads session from AuthContext (Supabase). Redirects to /login when
 * unauthenticated. Shows blank background during the initial auth check
 * to prevent flashing protected content.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  // Blank during auth check — no flash of protected content
  if (loading || !session) {
    return <div className="h-full w-full" style={{ background: 'var(--bg-base)' }} />;
  }

  return <>{children}</>;
}
