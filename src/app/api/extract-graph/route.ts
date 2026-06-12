/**
 * POST /api/extract-graph
 *
 * Deep knowledge-graph extraction via Gemini.
 * Models understanding depth, identifies gaps, classifies edge semantics,
 * and generates an intelligence summary of the user's knowledge state.
 *
 * Body: multipart/form-data { text? } or { pdf? } or application/json { text }
 * Response: { graph: GraphData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeForPrompt, rateLimitBody, LIMITS } from '@/lib/sanitize';
import type { GraphData, GraphNode, GraphEdge, SemanticEdgeType, DepthLevel, GraphIntelligenceSummary } from '@/types/graph';
import { getPostHogClient } from '@/lib/posthog-server';

// 20 graph extractions per 15 minutes per IP (each call is expensive)
const AI_RATE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('429');
      if (!isRetryable || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

const VALID_SEMANTIC_TYPES = new Set<SemanticEdgeType>([
  'ENABLES', 'IS_A', 'CAUSES', 'CONTRASTS', 'PART_OF', 'DEPENDS_ON', 'LEADS_TO', 'RELATES_TO',
]);

const VALID_DEPTH_LEVELS = new Set<DepthLevel>(['surface', 'explained', 'mastered']);

interface RawNode {
  id: string;
  label: string;
  type: string;
  centrality: number;
  clusterId: string;
  clusterName: string;
  summary: string;
  sourceQuote: string;
  whyItMatters: string;
  depthLevel: string;
  gaps: string[];
  expansionSuggestions: string[];
}

interface RawEdge {
  sourceId: string;
  targetId: string;
  label: string;
  weight: number;
  semanticType: string;
  explanation: string;
}

interface RawGraph {
  title: string;
  nodes: RawNode[];
  edges: RawEdge[];
  intelligenceSummary: {
    strongAreas: string[];
    weakAreas: string[];
    mainConcept: string;
    mostIsolatedConcept: string;
    gaps: string[];
    suggestion: string;
    overview: string;
  };
}

const CLUSTER_COLORS: Record<string, string> = {
  'cluster-a': '#C86870',
  'cluster-b': '#5EAB82',
  'cluster-c': '#9080C0',
  'cluster-d': '#C89840',
  'cluster-e': '#5AA0A8',
};

// Extended palette for cluster IDs beyond the 5 predefined ones
const CLUSTER_PALETTE = [
  '#C86870', '#5EAB82', '#9080C0', '#C89840', '#5AA0A8',
  '#D4748C', '#4FA88A', '#7B6FD4', '#C4A030', '#3A98B0',
  '#B05868', '#5A9878', '#8868C8', '#C49030', '#4A90A8',
];

function clusterColor(id: string): string {
  if (CLUSTER_COLORS[id]) return CLUSTER_COLORS[id];
  // Deterministic hash so the same cluster ID always maps to the same color
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CLUSTER_PALETTE[hash % CLUSTER_PALETTE.length];
}

// ── Label-aware comfort radius for raw API nodes ─────────────────────────────

function estimateLabelWidth(label: string): number {
  const text = label.split(/\s+/).slice(0, 4).join(' ');
  return Math.min(text.length, 22) * 6.5 + 36;
}

function rawComfortRadius(n: RawNode): number {
  const size = 8 + Math.min(1, Math.max(0, n.centrality)) * 16; // mirrors GraphNode size calc
  const br = Math.max(14, size);
  const halfLabel = estimateLabelWidth(n.label) / 2;
  return Math.max(br + 8, halfLabel, 42);
}

function assignPositions(nodes: RawNode[]): Map<string, { x: number; y: number }> {
  const clusters = new Map<string, RawNode[]>();
  for (const n of nodes) {
    const list = clusters.get(n.clusterId) ?? [];
    list.push(n);
    clusters.set(n.clusterId, list);
  }
  const clusterIds = [...clusters.keys()];

  // Outer ring: generous cluster separation (~85 px per cluster).
  const outerRadius = Math.max(180, clusterIds.length * 60);
  const positions = new Map<string, { x: number; y: number }>();

  clusterIds.forEach((cid, ci) => {
    const clusterAngle = (2 * Math.PI * ci) / clusterIds.length - Math.PI / 2;
    const cx = outerRadius * Math.cos(clusterAngle);
    const cy = outerRadius * Math.sin(clusterAngle);
    const members = clusters.get(cid)!;

    const sorted = [...members].sort((a, b) => (b.centrality ?? 0) - (a.centrality ?? 0));

    // Inner ring: sized so adjacent arc spacing ≈ 145 px (n * 24 px formula).
    const innerRadius = Math.max(55, sorted.length * 16);

    sorted.forEach((n, ni) => {
      if (ni === 0) {
        positions.set(n.id, { x: Math.round(cx), y: Math.round(cy) });
        return;
      }
      const angle = (2 * Math.PI * ni) / sorted.length - Math.PI / 2;
      positions.set(n.id, {
        x: Math.round(cx + innerRadius * Math.cos(angle)),
        y: Math.round(cy + innerRadius * Math.sin(angle)),
      });
    });
  });

  // Minimal collision resolution — only prevents exact overlaps.
  const MIN_SEP = 50;
  const pts = [...positions.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));

  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (dist < MIN_SEP) {
          const push = (MIN_SEP - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          pts[i].x -= ux * push;
          pts[i].y -= uy * push;
          pts[j].x += ux * push;
          pts[j].y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  for (const pt of pts) {
    positions.set(pt.id, { x: Math.round(pt.x), y: Math.round(pt.y) });
  }

  return positions;
}

const SYSTEM_PROMPT = `You are a deep knowledge-modelling engine. Your job is not to extract vocabulary — it is to model a person's conceptual understanding from their notes and identify the structure, depth, and gaps in that understanding.

You will return a rich JSON object that captures:
- What concepts exist and how they relate
- How deeply the person understands each concept (surface mention vs fully explained vs mastered)
- What connections are implied but not made explicit
- What the person understands well vs where gaps exist
- Direct quotes from their text that evidence their understanding
- Why each concept matters within the context of these specific notes

OUTPUT SCHEMA (return ONLY valid JSON, no markdown):
{
  "title": "concise knowledge domain title (5 words max)",
  "nodes": [
    {
      "id": "kebab-case-slug",
      "label": "Human Readable Name",
      "type": "concept|entity|relation|orphan",
      "centrality": 0.0–1.0,
      "clusterId": "cluster-a|cluster-b|cluster-c|cluster-d",
      "clusterName": "Short thematic name for this cluster (2-3 words)",
      "summary": "1-2 sentence summary grounded specifically in how THIS text discusses this concept — not a generic definition",
      "sourceQuote": "A direct or near-direct quote (20-60 words) from the source text that best represents this concept. If text is paraphrased notes, reconstruct the most relevant passage.",
      "whyItMatters": "1-2 sentences on why this concept is important specifically within the context of these notes — reference other concepts it connects to",
      "depthLevel": "surface|explained|mastered",
      "gaps": ["A specific missing connection or unexplored angle, phrased as an insight"],
      "expansionSuggestions": ["Related concept not in the notes worth adding"]
    }
  ],
  "edges": [
    {
      "sourceId": "node-id",
      "targetId": "node-id",
      "label": "short verb phrase (3-5 words)",
      "weight": 0.0–1.0,
      "semanticType": "ENABLES|IS_A|CAUSES|CONTRASTS|PART_OF|DEPENDS_ON|LEADS_TO|RELATES_TO",
      "explanation": "One clear sentence explaining HOW and WHY these two concepts connect. Use active voice. Mention both concept names. E.g.: 'Regularization reduces overfitting by penalizing excessive model complexity, preventing the model from memorizing noise.' or 'R-squared measures how well the regression line explains variance in the data, ranging from 0 (no fit) to 1 (perfect fit).'"
    }
  ],
  "intelligenceSummary": {
    "strongAreas": ["2-4 word description of well-covered area"],
    "weakAreas": ["2-4 word description of underdeveloped area"],
    "mainConcept": "id of the single most important concept",
    "mostIsolatedConcept": "id of the concept with fewest connections",
    "gaps": ["Specific actionable observation about a knowledge gap"],
    "suggestion": "One specific sentence recommending what to upload next to strengthen the weakest area",
    "overview": "2-3 sentence synthesis of the person's overall knowledge state — what they understand well, what's missing, and what the knowledge structure reveals"
  }
}

SEMANTIC EDGE TYPES:
- ENABLES: A makes B possible or facilitates B
- IS_A: taxonomic, definitional, or subclass relationship
- CAUSES: direct causal link (A produces B)
- CONTRASTS: opposition, tension, or trade-off
- PART_OF: compositional (A is a component of B)
- DEPENDS_ON: A requires B to function or be understood
- LEADS_TO: sequential, temporal, or logical progression
- RELATES_TO: weak associative link (use sparingly as fallback)

DEPTH LEVELS:
- surface: concept is mentioned but not explained (e.g. "we used X")
- explained: concept is described with some reasoning (e.g. "X works by doing Y")
- mastered: concept is explained with nuance, examples, or connections (e.g. "X works by Y because of Z, which means...")

RULES:
- Extract 8-20 nodes (important, non-trivial concepts only)
- Extract 10-30 edges (meaningful, typed relationships)
- Use 2-4 clusters with descriptive clusterName values
- sourceQuote must come from the actual text (reconstruct if notes are bullet points)
- gaps should be insightful observations, not generic advice
- expansionSuggestions should be specific concepts, not categories
- centrality: 1.0 = everything depends on understanding this; 0.1 = peripheral detail`;

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
  const rl = checkRateLimit(`ai:extract:${ip}`, AI_RATE_LIMIT.max, AI_RATE_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(rateLimitBody(rl.resetAt), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service not configured.' }, { status: 500 });

  // ── Parse & validate input ─────────────────────────────────────────────────
  let text: string | null = null;
  let pdfBase64: string | null = null;
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const t = form.get('text');
    const p = form.get('pdf');
    if (typeof t === 'string' && t.trim()) text = t.trim();
    if (p instanceof File) {
      if (p.size > LIMITS.PDF_BYTES) {
        return NextResponse.json(
          { error: `PDF too large. Maximum ${LIMITS.PDF_BYTES / 1024 / 1024} MB.` },
          { status: 413 },
        );
      }
      pdfBase64 = Buffer.from(await p.arrayBuffer()).toString('base64');
    }
  } else {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const raw = (body as Record<string, unknown>)?.text;
    if (typeof raw === 'string' && raw.trim()) text = raw.trim();
  }

  if (!text && !pdfBase64) return NextResponse.json({ error: 'Provide text or pdf.' }, { status: 400 });

  if (text && text.length > LIMITS.TEXT_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input too large. Maximum ${LIMITS.TEXT_INPUT_CHARS.toLocaleString()} characters.` },
      { status: 413 },
    );
  }

  // Sanitize text and wrap in a delimiter to prevent prompt injection
  if (text) text = sanitizeForPrompt(text);

  try {
    const ai = new GoogleGenAI({ apiKey });

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: Part[] = text
      ? [{ text: `--- BEGIN USER TEXT ---\n${text}\n--- END USER TEXT ---` }]
      : [{ inlineData: { mimeType: 'application/pdf', data: pdfBase64! } }, { text: 'Extract a deep knowledge graph from this document.' }];

    const generate = (model: string) =>
      withRetry(() =>
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        })
      );

    let res;
    try {
      res = await generate('gemini-2.5-flash');
    } catch (primaryErr) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const isFallbackable = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isFallbackable) throw primaryErr;
      console.warn('[extract-graph] gemini-2.5-flash failed after retries, falling back to gemini-2.0-flash:', msg);
      res = await generate('gemini-2.0-flash');
    }
    const rawText = res.text?.trim() ?? '';

    if (!rawText) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again with different text.' }, { status: 502 });
    }

    const raw = rawText;
    const json = raw.startsWith('```') ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '') : raw;

    let g: RawGraph;
    try {
      g = JSON.parse(json) as RawGraph;
    } catch {
      console.error('[extract-graph] JSON parse failed. Raw response (first 500 chars):', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned a malformed response. Please try again.' }, { status: 502 });
    }

    if (!g || typeof g !== 'object') {
      return NextResponse.json({ error: 'AI returned an unexpected response format. Please try again.' }, { status: 502 });
    }

    if (!Array.isArray(g.nodes) || g.nodes.length === 0) {
      return NextResponse.json({ error: 'No concepts extracted — try longer or more detailed text.' }, { status: 422 });
    }

    // Ensure edges is always an array even if Gemini omits it
    if (!Array.isArray(g.edges)) g.edges = [];

    // Filter out malformed nodes (must have at least id and label)
    g.nodes = g.nodes.filter((n): n is RawNode =>
      n != null && typeof n.id === 'string' && typeof n.label === 'string' && n.id.length > 0 && n.label.length > 0
    );

    if (g.nodes.length === 0) {
      return NextResponse.json({ error: 'No valid concepts extracted — try longer or more detailed text.' }, { status: 422 });
    }

    const positions = assignPositions(g.nodes);
    const now = new Date().toISOString();
    const graphId = `graph-${Date.now()}`;
    const validTypes = new Set(['concept', 'entity', 'relation', 'orphan']);

    const nodes: GraphNode[] = g.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      const centrality = typeof n.centrality === 'number' ? Math.min(1, Math.max(0, n.centrality)) : 0.5;
      return {
        id: n.id,
        label: n.label,
        type: (validTypes.has(n.type) ? n.type : 'concept') as GraphNode['type'],
        sourceId: 'src-user',
        metadata: {
          summary: n.summary ?? '',
          sourceQuote: n.sourceQuote ?? '',
          whyItMatters: n.whyItMatters ?? '',
          depthLevel: (VALID_DEPTH_LEVELS.has(n.depthLevel as DepthLevel) ? n.depthLevel : 'surface') as DepthLevel,
          gaps: Array.isArray(n.gaps) ? n.gaps : [],
          expansionSuggestions: Array.isArray(n.expansionSuggestions) ? n.expansionSuggestions : [],
        },
        createdAt: now,
        x: pos.x,
        y: pos.y,
        size: Math.round(8 + centrality * 16),
        centrality,
        clusterId: n.clusterId ?? 'cluster-a',
        clusterColor: clusterColor(n.clusterId ?? 'cluster-a'),
        clusterName: n.clusterName ?? '',
      };
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: GraphEdge[] = g.edges
      .filter((e) => e != null && typeof e.sourceId === 'string' && typeof e.targetId === 'string' && nodeIds.has(e.sourceId) && nodeIds.has(e.targetId) && e.sourceId !== e.targetId)
      .map((e, i) => ({
        id: `e${i + 1}`,
        sourceId: e.sourceId,
        targetId: e.targetId,
        label: typeof e.label === 'string' ? e.label : '',
        weight: typeof e.weight === 'number' ? Math.min(1, Math.max(0, e.weight)) : 0.5,
        type: 'semantic' as const,
        semanticType: (VALID_SEMANTIC_TYPES.has(e.semanticType as SemanticEdgeType)
          ? e.semanticType
          : 'RELATES_TO') as SemanticEdgeType,
        explanation: typeof e.explanation === 'string' ? e.explanation : undefined,
        createdAt: now,
      }));

    const toArr = (v: unknown): string[] =>
      Array.isArray(v) ? (v as string[]) : typeof v === 'string' ? [v] : [];

    const intelligenceSummary: GraphIntelligenceSummary | undefined = g.intelligenceSummary
      ? {
          strongAreas: toArr(g.intelligenceSummary.strongAreas),
          weakAreas: toArr(g.intelligenceSummary.weakAreas),
          mainConcept: g.intelligenceSummary.mainConcept ?? '',
          mostIsolatedConcept: g.intelligenceSummary.mostIsolatedConcept ?? '',
          gaps: toArr(g.intelligenceSummary.gaps),
          suggestion: g.intelligenceSummary.suggestion ?? '',
          overview: g.intelligenceSummary.overview ?? '',
        }
      : undefined;

    const graph: GraphData = {
      id: graphId,
      userId: 'local-user',
      name: g.title,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      createdAt: now,
      updatedAt: now,
      nodes,
      edges,
      intelligenceSummary,
    };

    try {
      const posthog = getPostHogClient();
      posthog?.capture({
        distinctId: session.user.id,
        event: 'server_graph_extracted',
        properties: {
          graph_id: graph.id,
          graph_name: graph.name,
          node_count: graph.nodeCount,
          edge_count: graph.edgeCount,
          input_type: pdfBase64 ? 'pdf' : 'text',
        },
      });
    } catch (phErr) {
      console.error('[extract-graph] posthog capture error (non-fatal):', phErr instanceof Error ? phErr.message : String(phErr));
    }

    return NextResponse.json({ graph });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[extract-graph] error:', msg);

    // API key misconfiguration
    if (msg.includes('API_KEY') || msg.includes('api key') || msg.includes('API key')) {
      return NextResponse.json({ error: 'AI service not configured. Contact support.' }, { status: 500 });
    }

    // Quota / rate limiting
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'AI quota exceeded. Try again in a few minutes.' }, { status: 429 });
    }

    // Overload / 503 — both models failed
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('429')) {
      return NextResponse.json({ error: 'AI service is temporarily overloaded. Please wait a moment and try again.' }, { status: 503 });
    }

    // Network failures (timeouts, connection resets, DNS)
    if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('socket hang up') || msg.includes('ECONNREFUSED')) {
      return NextResponse.json({ error: 'Could not reach the AI service. Check your connection and try again.' }, { status: 503 });
    }

    // Invalid input (bad PDF, image-only, etc.)
    if (
      msg.includes('INVALID_ARGUMENT') ||
      msg.includes('unsupported') ||
      msg.includes('Unable to process') ||
      msg.includes('image') ||
      msg.includes('cannot be processed') ||
      msg.includes('no text')
    ) {
      return NextResponse.json(
        { error: 'This file couldn\'t be processed. PDFs must contain readable text — image-only or scanned documents without OCR text cannot be extracted. Try copying the text and pasting it directly instead.' },
        { status: 422 },
      );
    }

    // Catch-all with the actual error logged for debugging
    console.error('[extract-graph] unhandled error detail:', msg);
    return NextResponse.json({ error: 'Something went wrong during extraction. Please try again — if this keeps happening, try shorter or simpler text.' }, { status: 500 });
  }
}
