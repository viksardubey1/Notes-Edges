/**
 * GET /api/graphs/[id]
 *
 * Public endpoint — returns any graph by ID using the service role key.
 * Used for shared graph links where the viewer may not be logged in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('graphs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
  }

  const graph = {
    ...data.data,
    id: data.id,
    userId: data.user_id,
    name: data.name,
    nodeCount: data.node_count,
    edgeCount: data.edge_count,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  };

  return NextResponse.json({ graph });
}
