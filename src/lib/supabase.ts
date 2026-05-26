/**
 * Supabase Browser Client — Notes & Edges
 *
 * Single shared instance for all client components.
 * Uses the public anon key + Row Level Security for authorization.
 */

import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
