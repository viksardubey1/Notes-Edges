/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email via Supabase. Rate-limited to 3 attempts
 * per 15 min per IP. Always returns 200 regardless of whether the email
 * exists — prevents user enumeration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateEmail, rateLimitBody } from '@/lib/sanitize';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`auth:forgot-password:${ip}`, MAX_ATTEMPTS, WINDOW_MS);

  if (!rl.allowed) {
    return NextResponse.json(rateLimitBody(rl.resetAt), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email: rawEmail } = (body ?? {}) as Record<string, unknown>;
  const email = validateEmail(String(rawEmail ?? ''));
  if (!email) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';

  // redirectTo lands back at /auth/callback which sets the session,
  // then forwards to /reset-password via the `next` param.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always return 200 — don't reveal whether the email exists.
  return NextResponse.json({ ok: true });
}
