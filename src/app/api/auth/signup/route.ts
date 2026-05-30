/**
 * POST /api/auth/signup
 *
 * Rate-limited signup proxy. Enforces 5 attempts per 15 min per IP,
 * validates all fields, then delegates to Supabase Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateEmail, sanitizeName, rateLimitBody, LIMITS } from '@/lib/sanitize';
import { getPostHogClient } from '@/lib/posthog-server';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = checkRateLimit(`auth:signup:${ip}`, MAX_ATTEMPTS, WINDOW_MS);

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

  const { email: rawEmail, password: rawPassword, name: rawName } = body as Record<string, unknown>;

  const email = validateEmail(String(rawEmail ?? ''));
  if (!email) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

  if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }
  const password = rawPassword.slice(0, LIMITS.PASSWORD_CHARS);

  const name = sanitizeName(String(rawName ?? '')).slice(0, LIMITS.NAME_CHARS) || email.split('@')[0];

  // ── Supabase auth ──────────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notes-edges.com';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error('[signup] Supabase error:', error.message, error.status);
    // Map Supabase error messages to user-friendly ones
    const msg = error.message.toLowerCase();
    if (msg.includes('email') && msg.includes('disabled')) {
      return NextResponse.json({ error: 'Email sign-up is currently unavailable. Please use Google to continue.' }, { status: 400 });
    }
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 400 });
    }
    if (msg.includes('password')) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) return NextResponse.json({ error: 'Sign-up failed. Please try again.' }, { status: 400 });

  const posthog = getPostHogClient();
  posthog?.identify({ distinctId: data.user.id, properties: { email: data.user.email ?? email, name } });
  posthog?.capture({ distinctId: data.user.id, event: 'server_signup', properties: { email: data.user.email ?? email, name } });

  const session = data.session;

  return NextResponse.json({
    access_token: session?.access_token ?? null,
    refresh_token: session?.refresh_token ?? null,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
      name,
    },
  });
}
