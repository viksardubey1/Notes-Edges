/**
 * GET /auth/callback
 *
 * Handles two Supabase auth flows:
 *
 * 1. PKCE (OAuth + email confirmation with code):
 *    ?code=... — exchangeCodeForSession()
 *
 * 2. Token hash (email confirmation / magic link):
 *    ?token_hash=...&type=email|signup|recovery — verifyOtp()
 *
 * Security:
 * - PKCE code verifier is validated by Supabase automatically
 * - The `next` param is sanitised — only relative paths are accepted
 * - Errors redirect to /login with a generic message (no internal details leaked)
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Only allow relative redirects to prevent open-redirect attacks.
  const rawNext = searchParams.get('next') ?? '/home';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/home';

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  if (code) {
    // PKCE flow — Google OAuth and newer email confirmation
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  } else if (tokenHash && type) {
    // Token hash flow — email confirmation / magic link / password reset
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
