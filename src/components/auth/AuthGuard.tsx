'use client';

/**
 * AuthGuard — Notes & Edges
 *
 * Client component that checks localStorage for a valid session.
 * Redirects to /login if none found. Renders children when authenticated.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    // Blank during redirect check — no flash of content
    return <div className="h-full w-full" style={{ background: 'var(--bg-base)' }} />;
  }

  return <>{children}</>;
}
