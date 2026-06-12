/**
 * GraphQuizDrawer — Notes & Edges
 *
 * Bottom-sheet quiz covering the whole graph — ~20 questions on concepts
 * and relationships. Generated once, saved to graph.quiz, reused on
 * subsequent opens.
 *
 * UI rules:
 * - Slides up from bottom, does NOT occlude the full graph
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
import type { GraphQuiz, QuizQuestion } from '@/types/graph';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuizQuestion['type'], string> = {
  concept: 'Concept',
  relationship: 'Relationship',
  application: 'Application',
};

const TYPE_COLORS: Record<QuizQuestion['type'], string> = {
  concept: '#6B58C0',
  relationship: '#3B9EBF',
  application: '#B05890',
};

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

  // Sync stored quiz from graph whenever the drawer opens or graph changes
  useEffect(() => {
    if (graph?.quiz && !quiz) setQuiz(graph.quiz);
  }, [graph?.quiz, quiz]);

  // Auto-generate when drawer opens and no quiz exists yet
  useEffect(() => {
    if (quizOpen && graph && !quiz && !generating) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizOpen]);

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

  function handleNext() {
    if (!quiz) return;
    if (currentQ + 1 >= quiz.questions.length) {
      setDone(true);
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
            style={{ background: 'rgba(10, 6, 20, 0.50)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeQuiz}
          />

          {/* Drawer */}
          <motion.div
            key="quiz-drawer"
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto"
            style={{ maxHeight: '74vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.30, ease: [0.32, 0.72, 0, 1] }}
          >
            <div
              className="flex flex-col rounded-t-[24px] overflow-hidden"
              style={{
                background: 'rgba(16, 10, 36, 0.98)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderBottom: 'none',
                boxShadow: '0 -24px 80px rgba(10,6,20,0.55)',
                backdropFilter: 'blur(32px)',
                maxHeight: '74vh',
              }}
            >

              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {graph?.name ?? 'Graph'} — Quiz
                  </p>
                  {quiz && !done && !generating && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {questions.length} questions · {graph?.nodes.length ?? 0} concepts
                    </p>
                  )}
                </div>
                <button
                  onClick={closeQuiz}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">

                {/* Generating */}
                {generating && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Loader2 size={26} className="animate-spin" style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      Generating quiz from your knowledge graph…
                    </p>
                  </div>
                )}

                {/* Error */}
                {!generating && genError && (
                  <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
                    <p className="text-[13px]" style={{ color: '#E05878' }}>{genError}</p>
                    <button
                      onClick={() => void generate()}
                      className="px-4 py-2 rounded-[10px] text-[12px] font-medium"
                      style={{ background: 'rgba(107,88,192,0.18)', color: 'var(--accent-primary)', border: '1px solid rgba(107,88,192,0.28)' }}
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
                    className="flex flex-col items-center gap-5 py-12 px-6 text-center"
                  >
                    <div>
                      <p className="text-[52px] font-light leading-none" style={{ color: 'var(--accent-primary)' }}>
                        {Math.round((score / questions.length) * 100)}%
                      </p>
                      <p className="text-[13px] font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
                        {score} / {questions.length} correct
                      </p>
                    </div>

                    <p className="text-[12px] max-w-[360px]" style={{ color: 'var(--text-muted)' }}>
                      {score === questions.length
                        ? 'Perfect. You know this graph inside out.'
                        : score / questions.length >= 0.75
                          ? 'Strong grasp. Review the concepts you missed in the graph.'
                          : score / questions.length >= 0.5
                            ? 'Good start. Keep exploring the connections.'
                            : 'Dig deeper into the graph — the edges will sharpen your understanding.'}
                    </p>

                    {/* Breakdown by type */}
                    <div className="flex flex-col gap-2 w-full max-w-[280px]">
                      {(['concept', 'relationship', 'application'] as QuizQuestion['type'][]).map((type) => {
                        const qs = questions.filter((q) => q.type === type);
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

                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={resetAttempt}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <RotateCcw size={11} /> Retry
                      </button>
                      <button
                        onClick={() => { setQuiz(null); void generate(); }}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-medium"
                        style={{ background: 'rgba(107,88,192,0.18)', color: 'var(--accent-primary)', border: '1px solid rgba(107,88,192,0.28)' }}
                      >
                        New questions
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Active question */}
                {!generating && !genError && quiz && !done && q && (
                  <div className="px-6 py-6 max-w-[700px] mx-auto">

                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: `${TYPE_COLORS[q.type]}18`, color: TYPE_COLORS[q.type], border: `1px solid ${TYPE_COLORS[q.type]}28` }}
                        >
                          {TYPE_LABELS[q.type]}
                        </span>
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                          {currentQ + 1} / {questions.length}
                        </span>
                      </div>
                      <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #6B58C0, #9876EE)' }}
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
                        <p className="text-[16px] leading-[1.65] font-medium" style={{ color: 'var(--text-primary)' }}>
                          {q.question}
                        </p>

                        {/* Choices */}
                        <div className="flex flex-col gap-2">
                          {q.choices.map((choice, idx) => {
                            const isSelected = selected === idx;
                            const isCorrect = idx === q.correct;
                            let bg = 'rgba(255,255,255,0.04)';
                            let border = 'rgba(255,255,255,0.08)';
                            let color = 'var(--text-secondary)';

                            if (revealed) {
                              if (isCorrect) { bg = 'rgba(96,200,152,0.10)'; border = 'rgba(96,200,152,0.35)'; color = '#60C898'; }
                              else if (isSelected) { bg = 'rgba(224,88,120,0.10)'; border = 'rgba(224,88,120,0.35)'; color = '#E05878'; }
                            }

                            return (
                              <motion.button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={revealed}
                                className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-left w-full"
                                style={{ background: bg, border: `1px solid ${border}`, color, cursor: revealed ? 'default' : 'pointer' }}
                                whileHover={revealed ? {} : { scale: 1.005, background: 'rgba(107,88,192,0.10)' }}
                                whileTap={revealed ? {} : { scale: 0.995 }}
                              >
                                <span
                                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                                  style={{
                                    background: revealed && isCorrect ? 'rgba(96,200,152,0.20)' : revealed && isSelected ? 'rgba(224,88,120,0.20)' : 'rgba(255,255,255,0.07)',
                                    color: 'inherit',
                                  }}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-[13px] leading-snug flex-1">{choice}</span>
                                {revealed && isCorrect && <CheckCircle size={15} style={{ color: '#60C898', flexShrink: 0 }} />}
                                {revealed && isSelected && !isCorrect && <XCircle size={15} style={{ color: '#E05878', flexShrink: 0 }} />}
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
                                className="px-4 py-3 rounded-[12px] text-[12px] leading-[1.75]"
                                style={{
                                  background: selected === q.correct ? 'rgba(96,200,152,0.07)' : 'rgba(255,255,255,0.03)',
                                  border: selected === q.correct ? '1px solid rgba(96,200,152,0.18)' : '1px solid rgba(255,255,255,0.06)',
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
                            className="flex items-center justify-center gap-2 py-3 rounded-[14px] text-[13px] font-semibold"
                            style={{ background: 'rgba(107,88,192,0.20)', color: 'var(--accent-primary)', border: '1px solid rgba(107,88,192,0.32)' }}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
