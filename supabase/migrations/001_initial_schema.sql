-- ─── Notes & Edges — Initial Schema ─────────────────────────────────────────
-- Run this in the Supabase SQL editor.

-- pgvector (already enabled via dashboard)
create extension if not exists vector;

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- Extends auth.users with display name. Created automatically on sign-up
-- via the trigger below.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Graphs ────────────────────────────────────────────────────────────────────
-- Stores the full graph payload (nodes + edges + metadata) as JSONB.
-- Separate columns for name / counts allow fast dashboard queries
-- without loading the full data blob.

create table if not exists public.graphs (
  id          text        primary key,               -- client-generated, e.g. "graph-1234567890"
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null default 'Untitled Graph',
  node_count  integer     not null default 0,
  edge_count  integer     not null default 0,
  data        jsonb       not null default '{}',     -- full GraphData payload
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists graphs_user_id_updated_at
  on public.graphs (user_id, updated_at desc);

alter table public.graphs enable row level security;

create policy "Users can read own graphs"
  on public.graphs for select
  using (auth.uid() = user_id);

create policy "Users can insert own graphs"
  on public.graphs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own graphs"
  on public.graphs for update
  using (auth.uid() = user_id);

create policy "Users can delete own graphs"
  on public.graphs for delete
  using (auth.uid() = user_id);


-- ── Node embeddings (pgvector) ────────────────────────────────────────────────
-- Optional: for powering the semantic search palette (⌘K).
-- Each row is one node's embedding, linked back to its graph.

create table if not exists public.node_embeddings (
  id          uuid        primary key default gen_random_uuid(),
  graph_id    text        not null references public.graphs (id) on delete cascade,
  node_id     text        not null,
  label       text        not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  unique (graph_id, node_id)
);

create index if not exists node_embeddings_graph_id
  on public.node_embeddings (graph_id);

create index if not exists node_embeddings_vector_idx
  on public.node_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.node_embeddings enable row level security;

create policy "Users can read own node embeddings"
  on public.node_embeddings for select
  using (
    exists (
      select 1 from public.graphs g
      where g.id = graph_id and g.user_id = auth.uid()
    )
  );

create policy "Users can insert own node embeddings"
  on public.node_embeddings for insert
  with check (
    exists (
      select 1 from public.graphs g
      where g.id = graph_id and g.user_id = auth.uid()
    )
  );

create policy "Users can delete own node embeddings"
  on public.node_embeddings for delete
  using (
    exists (
      select 1 from public.graphs g
      where g.id = graph_id and g.user_id = auth.uid()
    )
  );
