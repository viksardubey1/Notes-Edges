/**
 * Auth — Notes & Edges
 *
 * Supabase-backed authentication. All functions are async.
 * Components that need reactive session state should use useAuth()
 * from AuthContext instead of calling getSession() directly.
 */

import { supabase } from '@/lib/supabase';

// ── Types (kept identical to preserve all import sites) ───────────────────────

export interface Session {
  userId: string;
  email: string;
  name: string;
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSession(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Session {
  return {
    userId: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.['name'] as string | undefined) ?? user.email?.split('@')[0] ?? '',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: displayName }),
    });
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' };
  }

  const json = await res.json() as { error?: string; access_token?: string; refresh_token?: string; user?: { id: string; email: string; name: string } };
  if (!res.ok) return { ok: false, error: json.error ?? 'Sign-up failed.' };

  // Hydrate the Supabase browser session if tokens were returned
  // (email-confirmation flows may not return a session immediately)
  if (json.access_token && json.refresh_token) {
    await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
  }

  return { ok: true, session: { userId: json.user!.id, email: json.user!.email, name: json.user!.name } };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' };
  }

  const json = await res.json() as { error?: string; access_token?: string; refresh_token?: string; user?: { id: string; email: string; name: string } };
  if (!res.ok) return { ok: false, error: json.error ?? 'Sign-in failed.' };

  await supabase.auth.setSession({ access_token: json.access_token!, refresh_token: json.refresh_token! });

  return { ok: true, session: { userId: json.user!.id, email: json.user!.email, name: json.user!.name } };
}

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Request offline access so Supabase can refresh tokens silently
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** One-shot read of the current session. Prefer useAuth() in components. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  return toSession(data.session.user);
}

export async function updateDisplayName(userId: string, name: string): Promise<void> {
  await supabase.auth.updateUser({ data: { name } });

  // Also update the profiles table
  await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId);
}
