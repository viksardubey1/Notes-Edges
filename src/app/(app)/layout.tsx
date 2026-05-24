/**
 * App Layout — Notes & Edges
 *
 * Authenticated application shell. Wraps all /home, /graph/:id,
 * /welcome, /settings routes. AuthGuard redirects to /login if
 * no session is found in localStorage.
 */

import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="h-full w-full" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {children}
      </div>
    </AuthGuard>
  );
}
