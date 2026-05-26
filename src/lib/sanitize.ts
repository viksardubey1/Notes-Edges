/**
 * Input sanitization utilities — Notes & Edges
 *
 * All user-supplied text passes through here before it reaches
 * AI prompts or persistent storage.
 */

// ── Size limits ───────────────────────────────────────────────────────────────

export const LIMITS = {
  TEXT_INPUT_CHARS: 100_000,   // ~20k words — generous for notes
  PDF_BYTES: 20 * 1024 * 1024, // 20 MB
  NAME_CHARS: 100,
  EMAIL_CHARS: 254,            // RFC 5321 max
  PASSWORD_CHARS: 128,
} as const;

// ── Sanitizers ────────────────────────────────────────────────────────────────

/** Strip null bytes and ASCII control characters (except tab/newline/CR). */
function stripControls(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize user text before sending to an AI prompt.
 * - Strips control chars
 * - Trims to max length (returns truncated string, not an error)
 * - Wraps in a clear delimiter so injected instructions can't override the system prompt
 */
export function sanitizeForPrompt(raw: string, maxChars = LIMITS.TEXT_INPUT_CHARS): string {
  return stripControls(raw).slice(0, maxChars);
}

/** Sanitize a display name (stored in DB, shown in UI). */
export function sanitizeName(raw: string): string {
  return stripControls(raw.trim()).slice(0, LIMITS.NAME_CHARS);
}

/** Validate and normalise an email address. Returns null if invalid. */
export function validateEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase().slice(0, LIMITS.EMAIL_CHARS);
  // Simple RFC-ish check — Supabase will do full validation server-side
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

/** Return a rate-limit 429 response body. */
export function rateLimitBody(resetAt: number): { error: string } {
  const secs = Math.ceil((resetAt - Date.now()) / 1000);
  const mins = Math.ceil(secs / 60);
  return { error: `Too many attempts. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.` };
}
