/**
 * POST /api/admin/reposition-graphs
 *
 * One-shot migration: re-runs the updated cluster-ring layout on every graph
 * owned by the authenticated user and writes new x/y coordinates back to
 * Supabase. Safe to call multiple times (idempotent).
 *
 * Auth: requires a valid Supabase session cookie (user must be signed in).
 * Only touches graphs belonging to the calling user (RLS enforced).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { repositionNodes } from '@/lib/graph/reposition';
import type { GraphData } from '@/types/graph';

export async function POST(_req: NextRequest) {
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

  // Verify the caller is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Fetch every graph for this user
  const { data: rows, error: fetchError } = await supabase
    .from('graphs')
    .select('id, data')
    .eq('user_id', user.id);

  if (fetchError) {
    console.error('[reposition-graphs] fetch error:', fetchError.message);
    return NextResponse.json({ error: 'Failed to fetch graphs.' }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const graph = row.data as GraphData;
      if (!graph?.nodes?.length) continue;

      // Re-compute positions with the new spacing parameters
      const newPositions = repositionNodes(graph.nodes);

      const repositionedNodes = graph.nodes.map((n) => {
        const pos = newPositions.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });

      const updatedGraph: GraphData = {
        ...graph,
        nodes: repositionedNodes,
      };

      const { error: updateError } = await supabase
        .from('graphs')
        .update({
          data: updatedGraph,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('user_id', user.id); // belt-and-suspenders on top of RLS

      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    updated,
    total: rows.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
