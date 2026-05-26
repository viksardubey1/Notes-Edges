/**
 * App Layout — Notes & Edges
 *
 * Authenticated application shell. Wraps all /home, /graph/:id,
 * /welcome, /settings routes. AuthProvider supplies Supabase session
 * state to the whole tree; AuthGuard redirects to /login if not signed in.
 */

import { AuthProvider } from '@/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="h-full w-full" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
          {children}
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
