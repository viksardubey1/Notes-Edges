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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

  let text = '';
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const t = form.get('text');
    const p = form.get('pdf');
    if (typeof t === 'string') text = t;
    else if (p instanceof File) text = `[PDF: ${p.name}]`; // PDF analysis handled by extract-graph
  } else {
    const body = (await req.json()) as { text?: string };
    text = body.text ?? '';
  }

  if (!text.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nTEXT:\n${text.slice(0, 3000)}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const raw = result.response.text().trim();
    const json = raw.startsWith('```') ? raw.replace(/^```[^\n]*\n?/, '').replace(/```$/, '') : raw;
    const analysis = JSON.parse(json) as TextAnalysis;

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze-text]', message);
    // Non-fatal — the caller will continue without discoveries
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
