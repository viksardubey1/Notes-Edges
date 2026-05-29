# Notes & Edges

**Think in graphs.**

Notes & Edges transforms your notes, readings, and ideas into a living knowledge graph. Upload what you've learned — the app extracts concepts and connections, then renders them as an interactive, explorable map of understanding.

Live at [notes-edges.com](https://notes-edges.com)

---

## What it does

- **Upload notes** — paste text or upload documents; an AI pipeline extracts concepts and relationships
- **Knowledge graph** — nodes are concepts, edges are the connections between them, rendered as an interactive SVG graph
- **Explore** — zoom, pan, click nodes to expand their context, search across your graph
- **Share** — send a link to any graph; viewers can explore it without signing in or make their own copy
- **Multi-graph** — maintain separate graphs for different subjects or projects

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & DB | Supabase (Postgres + RLS) |
| AI | Google Gemini (graph extraction) |
| Graph rendering | Custom SVG renderer with LOD system |
| Animation | Framer Motion |
| State | Zustand |
| Analytics | PostHog |
| Deployment | Vercel |

## Project structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (app)/            # Authenticated routes (home, graph)
│   ├── (auth)/           # Auth routes (login, signup)
│   └── api/              # API routes (graph extraction, sharing)
├── components/
│   ├── graph/            # Graph canvas, renderers, loaders
│   ├── layout/           # Command bar, sidebar, nav
│   ├── panels/           # Upload sheet, node detail panel
│   └── providers/        # Theme, PostHog, auth providers
├── lib/                  # Graph logic, Supabase client, AI pipeline
├── store/                # Zustand stores (graph, UI state)
└── types/                # Shared TypeScript types
```

## Running locally

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/viksardubey1/Notes-Edges.git
cd Notes-Edges
npm install
```

2. Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed manually to Vercel:

```bash
vercel --prod
```

Environment variables are managed via `vercel env add` and stored encrypted in the Vercel project.
