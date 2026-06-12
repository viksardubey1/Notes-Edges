/**
 * GraphQuizDrawer — Notes & Edges
 *
 * Floating center-screen quiz card covering the whole graph — ~20 questions
 * on concepts and relationships. Generated once, saved to graph.quiz,
 * reused on subsequent opens.
 *
 * UI rules:
 * - Floats in the center with a soft backdrop
 * - Light, rounded, airy feel
 * - One question at a time with a progress bar
 * - Answer → explanation → next
 * - Results screen at the end
 * - No gamification
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useGraphStore } from '@/store/graph.store';
import { useAuth } from '@/context/AuthContext';
import { saveGraph } from '@/lib/graphs';
import type { GraphQuiz, QuizQuestion, QuizAttempt } from '@/types/graph';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuizQuestion['type'], string> = {
  concept: 'Concept',
  relationship: 'Relationship',
  application: 'Application',
};

const TYPE_COLORS: Record<QuizQuestion['type'], string> = {
  concept: '#7B6EC4',
  relationship: '#3A9EC0',
  application: '#B85A6E',
};

// ── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 54;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: 132, height: 132 }}>
      <svg width={132} height={132} viewBox="0 0 132 132">
        {/* Background ring */}
        <circle
          cx={66} cy={66} r={radius}
          fill="none"
          stroke="var(--bg-surface-2)"
          strokeWidth={stroke}
        />
        {/* Filled arc */}
        <motion.circle
          cx={66} cy={66} r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          transform="rotate(-90 66 66)"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-bright)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[32px] font-semibold leading-none tracking-tight"
          style={{ color: 'var(--accent-primary)' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          {pct}%
        </motion.span>
        <motion.span
          className="text-[11px] font-medium mt-1"
          style={{ color: 'var(--text-muted)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.55 }}
        >
          {score} / {total}
        </motion.span>
      </div>
    </div>
  );
}

// ── Trend Indicator ──────────────────────────────────────────────────────────

function TrendIndicator({ attempts }: { attempts: QuizAttempt[] }) {
  if (attempts.length < 2) return null;
  const last = attempts[attempts.length - 1];
  const prev = attempts[attempts.length - 2];
  const lastPct = (last.score / last.total) * 100;
  const prevPct = (prev.score / prev.total) * 100;
  const diff = Math.round(lastPct - prevPct);

  if (diff === 0) return null;

  const isUp = diff > 0;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-[8px]"
      style={{
        background: isUp ? 'rgba(58, 152, 112, 0.08)' : 'rgba(184, 90, 110, 0.07)',
        color: isUp ? '#2D7A5A' : 'var(--accent-warm)',
      }}
    >
      {isUp ? '\u2191' : '\u2193'} {Math.abs(diff)}% from last
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphQuizDrawer() {
  const { quizOpen, closeQuiz } = useUIStore();
  const { graph, setGraph } = useGraphStore();
  const { session } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GraphQuiz | null>(null);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Reset quiz state when graph changes
  const graphId = graph?.id;
  useEffect(() => {
    setQuiz(graph?.quiz ?? null);
    setCurrentQ(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
    setGenError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphId]);

  // Auto-generate when drawer opens and no quiz exists yet
  useEffect(() => {
    if (quizOpen && graph && !quiz && !generating) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizOpen, graphId]);

  // Close on Escape
  useEffect(() => {
    if (!quizOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeQuiz(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [quizOpen, closeQuiz]);

  async function generate() {
    if (!graph) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/quiz/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            label: n.label,
            summary: n.metadata?.summary,
            centrality: n.centrality,
          })),
          edges: graph.edges.map((e) => {
            const src = graph.nodes.find((n) => n.id === e.sourceId);
            const tgt = graph.nodes.find((n) => n.id === e.targetId);
            return {
              sourceLabel: src?.label ?? e.sourceId,
              targetLabel: tgt?.label ?? e.targetId,
              semanticType: e.semanticType,
              explanation: e.explanation,
            };
          }),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({} as { error?: string }))) as { error?: string };
        throw new Error(err.error ?? 'Failed to generate quiz');
      }

      const data = (await res.json()) as { questions: QuizQuestion[] };
      const newQuiz: GraphQuiz = { questions: data.questions, generatedAt: new Date().toISOString() };
      setQuiz(newQuiz);

      // Persist to graph
      const updated = { ...graph, quiz: newQuiz, updatedAt: new Date().toISOString() };
      setGraph(updated);
      if (session) void saveGraph(session.userId, updated);

      resetAttempt();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  function resetAttempt() {
    setCurrentQ(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  }

  function handleAnswer(idx: number) {
    if (revealed || !quiz) return;
    setSelected(idx);
    setRevealed(true);
    if (idx === quiz.questions[currentQ]?.correct) setScore((s) => s + 1);
  }

  function saveAttempt(finalScore: number) {
    if (!quiz || !graph) return;
    const attempt: QuizAttempt = {
      score: finalScore,
      total: quiz.questions.length,
      completedAt: new Date().toISOString(),
    };
    const updatedQuiz: GraphQuiz = {
      ...quiz,
      attempts: [...(quiz.attempts ?? []), attempt],
    };
    setQuiz(updatedQuiz);
    const updated = { ...graph, quiz: updatedQuiz, updatedAt: new Date().toISOString() };
    setGraph(updated);
    if (session) void saveGraph(session.userId, updated);
  }

  function handleNext() {
    if (!quiz) return;
    if (currentQ + 1 >= quiz.questions.length) {
      setDone(true);
      saveAttempt(score);
    } else {
      setCurrentQ((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  const questions = quiz?.questions ?? [];
  const q: QuizQuestion | undefined = questions[currentQ];

  return (
    <AnimatePresence>
      {quizOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="quiz-backdrop"
            className="fixed inset-0 z-40 pointer-events-auto"
            style={{ background: 'rgba(245, 243, 251, 0.55)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeQuiz}
          />

          {/* Floating card */}
          <motion.div
            key="quiz-card"
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-6"
          >
            <motion.div
              className="pointer-events-auto w-full max-w-[560px] flex flex-col rounded-[28px] overflow-hidden"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(123, 110, 196, 0.10)',
                boxShadow: '0 4px 24px rgba(37, 30, 61, 0.06), 0 20px 60px rgba(37, 30, 61, 0.08)',
                maxHeight: 'min(680px, 85vh)',
              }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >

              {/* Top accent gradient line */}
              <div
                className="flex-shrink-0"
                style={{
                  height: 3,
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-bright))',
                  borderRadius: '28px 28px 0 0',
                }}
              />

              {/* Header */}
              <div
                className="flex items-center justify-between px-7 py-5 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(123, 110, 196, 0.08)' }}
              >
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {graph?.name ?? 'Graph'} — Quiz
                  </p>
                  {quiz && !done && !generating && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {questions.length} questions · {graph?.nodes.length ?? 0} concepts
                    </p>
                  )}
                </div>
                <button
                  onClick={closeQuiz}
                  className="w-8 h-8 flex items-center justify-center rounded-[12px] transition-all"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">

                {/* Generating */}
                {generating && (
                  <div className="flex flex-col items-center justify-center gap-4 py-20">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      Generating quiz from your knowledge graph…
                    </p>
                  </div>
                )}

                {/* Error */}
                {!generating && genError && (
                  <div className="flex flex-col items-center gap-5 py-20 px-8 text-center">
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--accent-warm)' }}>{genError}</p>
                    <button
                      onClick={() => void generate()}
                      className="px-5 py-2.5 rounded-[14px] text-[12px] font-medium transition-colors"
                      style={{ background: 'var(--bg-surface-2)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Results */}
                {!generating && !genError && quiz && done && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-6 py-14 px-8 text-center"
                  >
                    {/* Score ring */}
                    <ScoreRing score={score} total={questions.length} />

                    {/* Trend indicator */}
                    {(quiz.attempts?.length ?? 0) > 1 && (
                      <TrendIndicator attempts={quiz.attempts!} />
                    )}

                    <p className="text-[12px] max-w-[340px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {score === questions.length
                        ? 'Perfect. You know this graph inside out.'
                        : score / questions.length >= 0.75
                          ? 'Strong grasp. Review the concepts you missed in the graph.'
                          : score / questions.length >= 0.5
                            ? 'Good start. Keep exploring the connections.'
                            : 'Dig deeper into the graph — the edges will sharpen your understanding.'}
                    </p>

                    {/* Breakdown by type */}
                    <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
                      {(['concept', 'relationship', 'application'] as QuizQuestion['type'][]).map((type) => {
                        const qs = questions.filter((qq) => qq.type === type);
                        if (qs.length === 0) return null;
                        return (
                          <div key={type} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[type] }} />
                              {TYPE_LABELS[type]}
                            </div>
                            <span style={{ color: 'var(--text-secondary)' }}>{qs.length} questions</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Past attempts — bar chart */}
                    {(quiz.attempts?.length ?? 0) > 1 && (
                      <div className="w-full max-w-[340px]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
                          Past attempts
                        </p>
                        <div className="flex items-end gap-2 justify-center" style={{ height: 72 }}>
                          {quiz.attempts!.slice(-8).map((a, i) => {
                            const pct = Math.round((a.score / a.total) * 100);
                            const isLatest = i === quiz.attempts!.slice(-8).length - 1;
                            const barHeight = Math.max(8, (pct / 100) * 64);
                            return (
                              <div
                                key={a.completedAt}
                                className="flex flex-col items-center gap-1"
                              >
                                <span
                                  className="text-[9px] tabular-nums font-medium"
                                  style={{ color: isLatest ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                >
                                  {pct}%
                                </span>
                                <motion.div
                                  className="rounded-[4px]"
                                  style={{
                                    width: 28,
                                    background: isLatest
                                      ? 'linear-gradient(180deg, var(--accent-primary), var(--accent-bright))'
                                      : 'var(--bg-surface-3)',
                                  }}
                                  initial={{ height: 0 }}
                                  animate={{ height: barHeight }}
                                  transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={resetAttempt}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-[14px] text-[12px] font-medium transition-all duration-200 hover:brightness-95"
                        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <RotateCcw size={11} /> Retry
                      </button>
                      <button
                        onClick={() => { setQuiz(null); void generate(); }}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-[14px] text-[12px] font-medium transition-all duration-200 hover:brightness-110"
                        style={{ background: 'var(--accent-primary)', color: '#FFFFFF' }}
                      >
                        New questions
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Active question */}
                {!generating && !genError && quiz && !done && q && (
                  <div className="px-7 py-7 max-w-[560px] mx-auto">

                    {/* Progress */}
                    <div className="mb-7">
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className="text-[9px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-[10px]"
                          style={{ background: `${TYPE_COLORS[q.type]}0D`, color: TYPE_COLORS[q.type] }}
                        >
                          {TYPE_LABELS[q.type]}
                        </span>
                        <div className="flex items-center gap-3">
                          {/* Live accuracy */}
                          {currentQ > 0 && (
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={score}
                                className="text-[10px] font-medium tabular-nums px-2 py-0.5 rounded-[8px]"
                                style={{
                                  background: score / currentQ >= 0.7 ? 'rgba(58, 152, 112, 0.08)' : score / currentQ >= 0.4 ? 'rgba(212, 168, 64, 0.08)' : 'rgba(184, 90, 110, 0.07)',
                                  color: score / currentQ >= 0.7 ? '#2D7A5A' : score / currentQ >= 0.4 ? '#B89030' : 'var(--accent-warm)',
                                }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                              >
                                {score}/{currentQ} correct
                              </motion.span>
                            </AnimatePresence>
                          )}
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={currentQ}
                              className="text-[11px] tabular-nums"
                              style={{ color: 'var(--text-muted)' }}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                            >
                              {currentQ + 1} / {questions.length}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-2)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-bright))' }}
                          animate={{ width: `${((currentQ + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Question */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQ}
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -14 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        <p className="text-[15px] leading-[1.7] font-medium" style={{ color: 'var(--text-primary)' }}>
                          {q.question}
                        </p>

                        {/* Choices */}
                        <div className="flex flex-col gap-2.5">
                          {q.choices.map((choice, idx) => {
                            const isSelected = selected === idx;
                            const isCorrect = idx === q.correct;
                            let bg = 'var(--bg-surface-2)';
                            let border = 'transparent';
                            let color = 'var(--text-secondary)';

                            if (revealed) {
                              if (isCorrect) { bg = 'rgba(58, 152, 112, 0.08)'; border = 'rgba(58, 152, 112, 0.25)'; color = '#2D7A5A'; }
                              else if (isSelected) { bg = 'rgba(184, 90, 110, 0.07)'; border = 'rgba(184, 90, 110, 0.22)'; color = 'var(--accent-warm)'; }
                            }

                            return (
                              <motion.button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={revealed}
                                className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left w-full transition-colors"
                                style={{ background: bg, border: `1.5px solid ${border}`, color, cursor: revealed ? 'default' : 'pointer' }}
                                whileHover={revealed ? {} : { scale: 1.005, backgroundColor: 'var(--bg-surface-3)' }}
                                whileTap={revealed ? {} : { scale: 0.995 }}
                              >
                                <span
                                  className="w-7 h-7 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[10px] font-semibold"
                                  style={{
                                    background: revealed && isCorrect ? 'rgba(58, 152, 112, 0.12)' : revealed && isSelected ? 'rgba(184, 90, 110, 0.10)' : '#FFFFFF',
                                    color: revealed && isCorrect ? '#2D7A5A' : revealed && isSelected ? 'var(--accent-warm)' : 'var(--text-muted)',
                                    border: revealed ? 'none' : '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-[13px] leading-snug flex-1">{choice}</span>
                                {revealed && isCorrect && <CheckCircle size={16} style={{ color: '#2D7A5A', flexShrink: 0 }} />}
                                {revealed && isSelected && !isCorrect && <XCircle size={16} style={{ color: 'var(--accent-warm)', flexShrink: 0 }} />}
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
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-4 py-3.5 rounded-[14px] text-[12px] leading-[1.8]"
                                style={{
                                  background: selected === q.correct ? 'rgba(58, 152, 112, 0.05)' : 'var(--bg-surface-2)',
                                  border: selected === q.correct ? '1px solid rgba(58, 152, 112, 0.12)' : '1px solid var(--border-subtle)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {q.explanation}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Next */}
                        {revealed && (
                          <motion.button
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: 0.08 }}
                            onClick={handleNext}
                            className="flex items-center justify-center gap-2 py-3 rounded-[16px] text-[13px] font-semibold transition-colors"
                            style={{ background: 'var(--accent-primary)', color: '#FFFFFF' }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {currentQ + 1 >= questions.length ? 'See results' : 'Next question'}
                            <ChevronRight size={14} />
                          </motion.button>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
