/**
 * POST /api/quiz/generate
 *
 * Generates 2–3 multiple-choice quiz questions for a graph node.
 * Uses the same Gemini setup as extract-graph / analyze-text.
 *
 * Body: application/json
 * {
 *   label: string;
 *   summary?: string;
 *   connections: Array<{ label: string; relationshipType?: string }>;
 * }
 *
 * Response: { questions: QuizQuestion[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { QuizQuestion } from '@/types/graph';

// 60 quiz generations per 15 minutes per IP
const AI_RATE_LIMIT = { max: 60, windowMs: 15 * 60 * 1000 };

interface GenerateQuizBody {
  label: string;
  summary?: string;
  connections: Array<{ label: string; relationshipType?: string }>;
}

interface RawQuestion {
  question: string;
  type: string;
  choices: string[];
  correct: number;
  explanation: string;
}

function buildPrompt(label: string, summary: string, connections: GenerateQuizBody['connections']): string {
  const connStr = connections.length > 0
    ? connections.slice(0, 8).map((c) => `- ${c.label}${c.relationshipType ? ` (${c.relationshipType})` : ''}`).join('\n')
    : '(no direct connections available)';

  return `You are generating quiz questions for a knowledge graph node. Be educational and concise.

Concept: "${label}"
${summary ? `Description: ${summary}` : ''}

Connected concepts:
${connStr}

Generate exactly 3 multiple-choice questions — one of each type:
1. concept: Tests what this concept means or does
2. relationship: Tests how this concept relates to one of its connected concepts
3. application: Tests what would happen or change given a scenario

Rules:
- Each question has exactly 4 answer choices (A, B, C, D)
- Exactly one is correct — make the others plausible but clearly wrong to a knowledgeable person
- Explanation is 1-2 sentences, explains WHY the correct answer is right
- Keep language clear and direct — no jargon without definition
- Do NOT include letter labels (A, B, C, D) in the choices array — just the text

Return ONLY valid JSON — no markdown, no backticks, no commentary:
{
  "questions": [
    {
      "question": "...",
      "type": "concept",
      "choices": ["choice 0", "choice 1", "choice 2", "choice 3"],
      "correct": 0,
      "explanation": "..."
    },
    {
      "question": "...",
      "type": "relationship",
      "choices": ["choice 0", "choice 1", "choice 2", "choice 3"],
      "correct": 1,
      "explanation": "..."
    },
    {
      "question": "...",
      "type": "application",
      "choices": ["choice 0", "choice 1", "choice 2", "choice 3"],
      "correct": 2,
      "explanation": "..."
    }
  ]
}`;
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
  // Auth check
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
  const limited = checkRateLimit(`quiz:${ip}`, AI_RATE_LIMIT.max, AI_RATE_LIMIT.windowMs);
  if (!limited.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  // Parse body
  let body: GenerateQuizBody;
  try {
    body = (await req.json()) as GenerateQuizBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { label, summary = '', connections = [] } = body;
  if (!label || typeof label !== 'string' || label.trim() === '') {
    return NextResponse.json({ error: 'label is required' }, { status: 400 });
  }

  // Generate with Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = buildPrompt(label.trim(), summary.trim(), connections);

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text().trim();
  } catch (err) {
    console.error('[quiz/generate] Gemini error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 502 });
  }

  // Parse JSON
  let parsed: { questions: RawQuestion[] };
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned) as { questions: RawQuestion[] };
  } catch {
    console.error('[quiz/generate] JSON parse failed. Raw:', raw.slice(0, 400));
    return NextResponse.json({ error: 'Failed to parse quiz response' }, { status: 502 });
  }

  const questions: QuizQuestion[] = (parsed.questions ?? [])
    .map(validateQuestion)
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, 3);

  if (questions.length === 0) {
    return NextResponse.json({ error: 'No valid questions generated' }, { status: 502 });
  }

  return NextResponse.json({ questions });
}
