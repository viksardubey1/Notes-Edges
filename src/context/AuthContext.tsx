'use client';

/**
 * AuthContext — Notes & Edges
 *
 * Wraps the entire app shell and keeps Supabase session state in sync.
 * All components call useAuth() instead of getSession() directly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@/lib/auth';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const toSession = useCallback((user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): Session | null => {
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email ?? '',
      name: (user.user_metadata?.['name'] as string | undefined) ?? user.email?.split('@')[0] ?? '',
    };
  }, []);

  useEffect(() => {
    // Initialise from existing session (handles page refresh)
    supabase.auth.getSession().then(({ data }) => {
      setSession(toSession(data.session?.user ?? null));
      setLoading(false);
    });

    // Keep in sync with Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(toSession(s?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toSession]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
