/**
 * NodeQuizCard — Notes & Edges
 *
 * Lightweight inline quiz for a graph node.
 * One question at a time, answer → reveal explanation → next.
 * No gamification. Graph stays the hero.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, RotateCcw, GraduationCap, Loader2 } from 'lucide-react';
import type { GraphNode, NodeQuiz, QuizQuestion } from '@/types/graph';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Connection {
  edge: { id: string; weight: number; semanticType?: string };
  other: GraphNode | undefined;
}

interface NodeQuizCardProps {
  node: GraphNode;
  connections: Connection[];
  accentRaw: string;
  onQuizSaved: (quiz: NodeQuiz) => void;
}

// ── Question type label ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuizQuestion['type'], string> = {
  concept: 'What it means',
  relationship: 'How it connects',
  application: 'What would happen',
};

// ── Main component ────────────────────────────────────────────────────────────

export function NodeQuizCard({ node, connections, accentRaw, onQuizSaved }: NodeQuizCardProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Use stored quiz if available
  const [activeQuiz, setActiveQuiz] = useState<NodeQuiz | null>(
    node.metadata?.quiz && typeof node.metadata.quiz === 'object' && Array.isArray((node.metadata.quiz as NodeQuiz).questions)
      ? (node.metadata.quiz as NodeQuiz)
      : null,
  );

  const quiz = activeQuiz;
  const questions = quiz?.questions ?? [];
  const q: QuizQuestion | undefined = questions[currentQ];

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: node.label,
          summary: node.metadata?.summary ?? '',
          connections: connections
            .filter((c) => c.other)
            .map((c) => ({ label: c.other!.label, relationshipType: c.edge.semanticType })),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({} as { error?: string }))) as { error?: string };
        throw new Error(err.error ?? 'Failed to generate quiz');
      }

      const data = (await res.json()) as { questions: QuizQuestion[] };
      const newQuiz: NodeQuiz = { questions: data.questions, generatedAt: new Date().toISOString() };
      setActiveQuiz(newQuiz);
      onQuizSaved(newQuiz);
      // Reset quiz state for fresh attempt
      setCurrentQ(0);
      setSelected(null);
      setRevealed(false);
      setScore(0);
      setDone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  function handleAnswer(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (q && idx === q.correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (currentQ + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrentQ((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  function handleRestart() {
    setCurrentQ(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  }

  // ── No quiz yet ────────────────────────────────────────────────────────────

  if (!quiz) {
    return (
      <div
        className="px-4 py-4 rounded-[16px] flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <GraduationCap size={13} style={{ color: accentRaw, opacity: 0.7 }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            No quiz yet
          </span>
        </div>
        {error && (
          <p className="text-[10px]" style={{ color: '#E05878' }}>{error}</p>
        )}
        <motion.button
          onClick={generate}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] text-[12px] font-semibold transition-all"
          style={{
            background: generating ? 'rgba(255,255,255,0.05)' : `${accentRaw}22`,
            color: generating ? 'var(--text-muted)' : accentRaw,
            border: `1px solid ${accentRaw}30`,
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
          whileHover={generating ? {} : { scale: 1.01 }}
          whileTap={generating ? {} : { scale: 0.98 }}
        >
          {generating ? (
            <><Loader2 size={12} className="animate-spin" /> Generating…</>
          ) : (
            <><GraduationCap size={12} /> Generate quiz</>
          )}
        </motion.button>
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const all = score === questions.length;
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-5 rounded-[16px] flex flex-col gap-4"
        style={{ background: `${accentRaw}0A`, border: `1px solid ${accentRaw}20` }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-[32px] font-light" style={{ color: accentRaw }}>
            {pct}%
          </span>
          <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {score}/{questions.length} correct
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {all ? 'Perfect. You know this well.' : pct >= 67 ? 'Good grasp. Review the misses.' : 'Keep exploring — the graph will help.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11px] font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RotateCcw size={10} /> Retry
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11px] font-medium"
            style={{ background: `${accentRaw}18`, color: accentRaw, border: `1px solid ${accentRaw}28` }}
          >
            {generating ? <><Loader2 size={10} className="animate-spin" /> Generating…</> : 'New questions'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Active question ────────────────────────────────────────────────────────

  if (!q) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQ}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-3"
      >
        {/* Progress + type label */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: `${accentRaw}14`, color: accentRaw, border: `1px solid ${accentRaw}25` }}>
            {TYPE_LABELS[q.type]}
          </span>
          <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
            {currentQ + 1} / {questions.length}
          </span>
        </div>

        {/* Question */}
        <p className="text-[13px] leading-[1.65] font-medium" style={{ color: 'var(--text-primary)' }}>
          {q.question}
        </p>

        {/* Choices */}
        <div className="flex flex-col gap-1.5">
          {q.choices.map((choice, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === q.correct;
            let bg = 'rgba(255,255,255,0.04)';
            let border = 'rgba(255,255,255,0.08)';
            let color = 'var(--text-secondary)';

            if (revealed) {
              if (isCorrect) {
                bg = 'rgba(96,200,152,0.10)';
                border = 'rgba(96,200,152,0.35)';
                color = '#60C898';
              } else if (isSelected && !isCorrect) {
                bg = 'rgba(224,88,120,0.10)';
                border = 'rgba(224,88,120,0.35)';
                color = '#E05878';
              }
            }

            return (
              <motion.button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={revealed}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] text-left w-full transition-all"
                style={{ background: bg, border: `1px solid ${border}`, color, cursor: revealed ? 'default' : 'pointer' }}
                whileHover={revealed ? {} : { scale: 1.01, background: `${accentRaw}10` }}
                whileTap={revealed ? {} : { scale: 0.99 }}
              >
                {/* Letter bubble */}
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                  style={{ background: revealed && isCorrect ? 'rgba(96,200,152,0.20)' : revealed && isSelected ? 'rgba(224,88,120,0.20)' : 'rgba(255,255,255,0.07)', color: 'inherit' }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[12px] leading-tight flex-1">{choice}</span>
                {revealed && isCorrect && <CheckCircle size={13} style={{ color: '#60C898', flexShrink: 0 }} />}
                {revealed && isSelected && !isCorrect && <XCircle size={13} style={{ color: '#E05878', flexShrink: 0 }} />}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="px-3.5 py-3 rounded-[12px] text-[11px] leading-[1.7]"
                style={{
                  background: selected === q.correct ? 'rgba(96,200,152,0.07)' : 'rgba(255,255,255,0.04)',
                  border: selected === q.correct ? '1px solid rgba(96,200,152,0.20)' : '1px solid rgba(255,255,255,0.07)',
                  color: 'var(--text-secondary)',
                }}
              >
                {q.explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next / Finish */}
        {revealed && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: 0.1 }}
            onClick={handleNext}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[12px] font-semibold"
            style={{ background: `${accentRaw}20`, color: accentRaw, border: `1px solid ${accentRaw}30` }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {currentQ + 1 >= questions.length ? 'See results' : 'Next question'}
            <ChevronRight size={12} />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
