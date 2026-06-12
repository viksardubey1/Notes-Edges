/**
 * POST /api/quiz/graph
 *
 * Generates ~20 multiple-choice questions covering the entire knowledge graph —
 * concepts (nodes), relationships (edges), and applications.
 *
 * Body: application/json
 * {
 *   nodes: Array<{ id: string; label: string; summary?: string; centrality: number }>;
 *   edges: Array<{ sourceLabel: string; targetLabel: string; semanticType?: string; explanation?: string }>;
 * }
 *
 * Response: { questions: QuizQuestion[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { QuizQuestion } from '@/types/graph';

// 20 graph quiz generations per 15 minutes per IP (expensive call)
const AI_RATE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
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

interface NodeSummary {
  id: string;
  label: string;
  summary?: string;
  centrality: number;
}

interface EdgeSummary {
  sourceLabel: string;
  targetLabel: string;
  semanticType?: string;
  explanation?: string;
}

interface GenerateGraphQuizBody {
  nodes: NodeSummary[];
  edges: EdgeSummary[];
}

interface RawQuestion {
  question: string;
  type: string;
  choices: string[];
  correct: number;
  explanation: string;
}

function buildPrompt(nodes: NodeSummary[], edges: EdgeSummary[]): string {
  // Pick a representative spread of nodes (prioritise by centrality, but include low-centrality ones too)
  const sorted = [...nodes].sort((a, b) => b.centrality - a.centrality);
  const topNodes = sorted.slice(0, 12);
  const tailNodes = sorted.slice(12).sort(() => Math.random() - 0.5).slice(0, 6);
  const selectedNodes = [...topNodes, ...tailNodes];

  const nodeLines = selectedNodes
    .map((n) => `- ${n.label}${n.summary ? `: ${n.summary.slice(0, 120)}` : ''}`)
    .join('\n');

  // Pick a spread of edges (prioritise ones with explanations)
  const explained = edges.filter((e) => e.explanation);
  const unnamed = edges.filter((e) => !e.explanation);
  const selectedEdges = [
    ...explained.slice(0, 12),
    ...unnamed.sort(() => Math.random() - 0.5).slice(0, 8),
  ].slice(0, 18);

  const edgeLines = selectedEdges
    .map((e) => `- "${e.sourceLabel}" ${e.semanticType ? e.semanticType.toLowerCase().replace('_', ' ') : '→'} "${e.targetLabel}"${e.explanation ? ` — ${e.explanation.slice(0, 100)}` : ''}`)
    .join('\n');

  return `You are generating a knowledge quiz from a concept graph. Create exactly 20 multiple-choice questions.

CONCEPTS in the graph:
${nodeLines}

RELATIONSHIPS between concepts:
${edgeLines}

Question distribution (total 20):
- 8 concept questions: "What is X?", "What does X do?", "Which best describes X?"
- 7 relationship questions: "How does X relate to Y?", "What connects X and Y?", "Which statement about X and Y is true?"
- 5 application questions: "If X were removed, what would happen to Y?", "Which scenario applies X correctly?"

Strict rules for answer choices:
- Every question has exactly 4 choices
- All 4 choices MUST be the same length and depth — aim for 12–22 words each, no choice shorter or longer than the others
- The correct choice must not be more detailed, more specific, or better-worded than the distractors
- Distractors must be plausible and well-formed — not obviously wrong due to being vague or short
- Do NOT include letter labels (A/B/C/D) in the choice text
- The "correct" index should vary across all questions — spread it evenly across 0, 1, 2, and 3

Other rules:
- Each question must reference specific concepts or relationships from the lists above
- Do not ask about the same concept twice across all 20 questions
- Explanation: 1–2 sentences explaining why the correct answer is right (not just restating it)

Return ONLY valid JSON — no markdown, no backticks, no commentary:
{
  "questions": [
    {
      "question": "...",
      "type": "concept",
      "choices": ["choice 0", "choice 1", "choice 2", "choice 3"],
      "correct": 0,
      "explanation": "..."
    }
  ]
}`;
}

/** Shuffle the 4 choices and update the correct index to match. */
function shuffleChoices(q: QuizQuestion): QuizQuestion {
  const correctText = q.choices[q.correct];
  const shuffled = [...q.choices].sort(() => Math.random() - 0.5) as [string, string, string, string];
  const newCorrect = shuffled.indexOf(correctText) as 0 | 1 | 2 | 3;
  return { ...q, choices: shuffled, correct: newCorrect };
}

function validateQuestion(q: RawQuestion): QuizQuestion | null {
  if (
    typeof q.question !== 'string' || q.question.trim() === '' ||
    !Array.isArray(q.choices) || q.choices.length !== 4 ||
    typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3 ||
    typeof q.explanation !== 'string' || q.explanation.trim() === ''
  ) return null;

  const type = ['concept', 'relationship', 'application'].includes(q.type)
    ? (q.type as QuizQuestion['type'])
    : 'concept';

  return {
    question: q.question.trim(),
    type,
    choices: [
      String(q.choices[0]).trim(),
      String(q.choices[1]).trim(),
      String(q.choices[2]).trim(),
      String(q.choices[3]).trim(),
    ] as [string, string, string, string],
    correct: Math.floor(q.correct) as 0 | 1 | 2 | 3,
    explanation: q.explanation.trim(),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit
  const ip = getClientIp(req);
  const limited = checkRateLimit(`quiz-graph:${ip}`, AI_RATE_LIMIT.max, AI_RATE_LIMIT.windowMs);
  if (!limited.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  // Parse body
  let body: GenerateGraphQuizBody;
  try {
    body = (await req.json()) as GenerateGraphQuizBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { nodes = [], edges = [] } = body;
  if (nodes.length < 2) {
    return NextResponse.json({ error: 'Graph needs at least 2 nodes to generate a quiz' }, { status: 400 });
  }

  // Generate
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 });

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(nodes, edges);

  const generate = (model: string) =>
    withRetry(() =>
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      })
    );

  let raw: string;
  try {
    let result;
    try {
      result = await generate('gemini-2.5-flash');
    } catch (primaryErr) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const isFallbackable = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isFallbackable) throw primaryErr;
      console.warn('[quiz/graph] gemini-2.5-flash failed after retries, falling back to gemini-2.0-flash:', msg);
      result = await generate('gemini-2.0-flash');
    }
    raw = result.text?.trim() ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[quiz/graph] Gemini error:', msg);

    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('429')) {
      return NextResponse.json({ error: 'AI service is temporarily overloaded. Please wait a moment and try again.' }, { status: 503 });
    }
    if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('fetch failed') || msg.includes('socket hang up')) {
      return NextResponse.json({ error: 'Could not reach the AI service. Check your connection and try again.' }, { status: 503 });
    }
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'AI quota exceeded. Try again in a few minutes.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Quiz generation failed. Please try again.' }, { status: 502 });
  }

  if (!raw) {
    return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 });
  }

  let parsed: { questions: RawQuestion[] };
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned) as { questions: RawQuestion[] };
  } catch {
    console.error('[quiz/graph] JSON parse failed. Raw:', raw.slice(0, 400));
    return NextResponse.json({ error: 'AI returned a malformed response. Please try again.' }, { status: 502 });
  }

  if (!parsed || !Array.isArray(parsed.questions)) {
    return NextResponse.json({ error: 'AI returned an unexpected response format. Please try again.' }, { status: 502 });
  }

  const questions: QuizQuestion[] = parsed.questions
    .map(validateQuestion)
    .filter((q): q is QuizQuestion => q !== null)
    .map(shuffleChoices)
    .slice(0, 22);

  if (questions.length < 5) {
    return NextResponse.json({ error: 'Not enough valid questions were generated. Try a graph with more concepts.' }, { status: 422 });
  }

  return NextResponse.json({ questions });
}
