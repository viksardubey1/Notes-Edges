/**
 * GET /auth/callback
 *
 * Supabase OAuth callback handler. After Google authenticates the user,
 * Supabase redirects here with a one-time `code`. We exchange it for a
 * session server-side (PKCE), set the session cookie, then redirect the
 * user into the app.
 *
 * Security:
 * - PKCE code verifier is validated by Supabase automatically
 * - The `next` param is sanitised — only relative paths are accepted
 * - Errors redirect to /login with a generic message (no internal details leaked)
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only allow relative redirects to prevent open-redirect attacks.
  // Must start with '/' but NOT '//' (protocol-relative URLs like //evil.com).
  const rawNext = searchParams.get('next') ?? '/home';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/home';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
