/**
 * POST /api/analyze-text
 *
 * Fast preliminary scan (~1-2s) that runs before the full extraction.
 * Returns enough information to show meaningful "discoveries" in the
 * welcome page progress screen while the main extraction runs.
 *
 * Body: application/json { text: string } or multipart/form-data { text, pdf }
 * Response: { topic, themes, conceptCount, coreConcept, insight, clusterNames }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeForPrompt, rateLimitBody, LIMITS } from '@/lib/sanitize';

// 30 requests per 15 minutes per IP
const AI_RATE_LIMIT = { max: 30, windowMs: 15 * 60 * 1000 };

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded');
      if (!isRetryable || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

export interface TextAnalysis {
  topic: string;
  themes: string[];
  conceptCount: number;
  coreConcept: string;
  insight: string;
  clusterNames: string[];
}

const PROMPT = `Quickly analyze this text and return a compact JSON object. Be fast — prioritize speed over depth.

Return ONLY this JSON structure (no markdown):
{
  "topic": "primary topic in 3-4 words",
  "themes": ["theme 1 (2-3 words)", "theme 2", "theme 3"],
  "conceptCount": integer (estimated distinct concepts),
  "coreConcept": "the single most important concept name",
  "insight": "One genuinely interesting, non-obvious observation about the knowledge structure or connections in this text (1 sentence)",
  "clusterNames": ["short name for thematic group 1", "group 2", "group 3"]
}`;

export async function POST(req: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        },
      },
    },
  );
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai:analyze:${ip}`, AI_RATE_LIMIT.max, AI_RATE_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(rateLimitBody(rl.resetAt), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service not configured.' }, { status: 500 });

  // ── Parse & validate input ─────────────────────────────────────────────────
  let rawText = '';
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const t = form.get('text');
    const p = form.get('pdf');
    if (typeof t === 'string') rawText = t;
    else if (p instanceof File) rawText = `[PDF: ${p.name}]`;
  } else {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    rawText = (body as Record<string, unknown>)?.text as string ?? '';
  }

  if (!rawText.trim()) return NextResponse.json({ error: 'No text provided.' }, { status: 400 });

  if (rawText.length > LIMITS.TEXT_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input too large. Maximum ${LIMITS.TEXT_INPUT_CHARS.toLocaleString()} characters.` },
      { status: 413 },
    );
  }

  // Sanitize and wrap in a delimiter to prevent prompt injection
  const safeText = sanitizeForPrompt(rawText);
  const userContent = `${PROMPT}\n\n--- BEGIN USER TEXT ---\n${safeText.slice(0, 3000)}\n--- END USER TEXT ---`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await withRetry(() =>
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { responseMimeType: 'application/json' },
      })
    );

    const raw = result.response.text().trim();
    const json = raw.startsWith('```') ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '') : raw;
    const analysis = JSON.parse(json) as TextAnalysis;

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze-text] error');
    // Non-fatal — the caller will continue without discoveries
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
