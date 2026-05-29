/**
 * POST /api/auth/login
 *
 * Rate-limited login proxy. Validates input, enforces 5 attempts per 15 min
 * per IP, then delegates to Supabase Auth. Returns tokens for the client to
 * hydrate its Supabase session via supabase.auth.setSession().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateEmail, rateLimitBody, LIMITS } from '@/lib/sanitize';
import { getPostHogClient } from '@/lib/posthog-server';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = checkRateLimit(`auth:login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);

  if (!rl.allowed) {
    return NextResponse.json(rateLimitBody(rl.resetAt), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email: rawEmail, password: rawPassword } = body as Record<string, unknown>;

  const email = validateEmail(String(rawEmail ?? ''));
  if (!email) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

  if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 1) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }
  const password = rawPassword.slice(0, LIMITS.PASSWORD_CHARS);

  // ── Supabase auth ──────────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const posthog = getPostHogClient();
  posthog?.capture({
    distinctId: data.user.id,
    event: 'server_login',
    properties: { email: data.user.email ?? email },
  });

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.['name'] as string | undefined) ?? email.split('@')[0],
    },
  });
}
