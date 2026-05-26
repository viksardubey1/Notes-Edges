'use client';

/**
 * Onboarding / Upload — Notes & Edges
 * Route: /welcome
 *
 * Step 1 — Explore: Live interactive sample graph.
 * Step 2 — Upload:  Paste text or drop a PDF.
 * Step 3 — Build:   Two-phase extraction:
 *   Phase A: /api/analyze-text fires immediately — feeds "discoveries" feed
 *   Phase B: /api/extract-graph runs in parallel — on success, redirect
 */

import { useState, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Upload, FileText, Loader2, X, AlertCircle } from 'lucide-react';
import { HeroGraph } from '@/components/marketing/HeroGraph';
import { useAuth } from '@/context/AuthContext';
import { saveGraph } from '@/lib/graphs';
import type { GraphData } from '@/types/graph';
import type { TextAnalysis } from '@/app/api/analyze-text/route';

type Step = 1 | 2 | 3;

interface Discovery {
  icon: string;
  label: string;
  value: string;
}

// Phase B progress messages — each conveys genuine AI reasoning
const EXTRACT_PHASES = [
  'Parsing conceptual structure…',
  'Mapping semantic relationships…',
  'Building knowledge topology…',
  'Detecting conceptual gaps…',
  'Calibrating understanding depth…',
  'Generating learning pathways…',
];

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const initialStep = searchParams.get('step') === '2' ? 2 : 1;

  const [step, setStep] = useState<Step>(initialStep as Step);
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 3 state
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const discoveryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const canGenerate =
    (activeTab === 'text' && text.length > 5) ||
    (activeTab === 'pdf' && droppedFile !== null);

  const addDiscovery = useCallback((d: Discovery, delayMs: number) => {
    const t = setTimeout(() => setDiscoveries((prev) => [...prev, d]), delayMs);
    discoveryTimers.current.push(t);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isLoading) return;
    setIsLoading(true);
    setStep(3);
    setPhaseIdx(0);
    setDiscoveries([]);
    setAnalysisDone(false);
    setExtractError(null);
    discoveryTimers.current.forEach(clearTimeout);
    discoveryTimers.current = [];

    // Advance extract-phase messages while API runs
    let phaseInterval: ReturnType<typeof setInterval> | null = null;
    phaseInterval = setInterval(() => {
      setPhaseIdx((i) => Math.min(i + 1, EXTRACT_PHASES.length - 1));
    }, 2200);

    // Build form for extract-graph (used by both calls)
    const form = new FormData();
    if (activeTab === 'text') {
      form.append('text', text);
    } else if (droppedFile) {
      form.append('pdf', droppedFile);
    }

    // ── Phase A: fast text scan ──────────────────────────────────────────────
    const analyzePromise: Promise<TextAnalysis | null> =
      activeTab === 'text'
        ? fetch('/api/analyze-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          })
            .then((r) => r.json())
            .then((d: { analysis?: TextAnalysis }) => d.analysis ?? null)
            .catch(() => null)
        : Promise.resolve(null);

    // ── Phase B: full extraction ─────────────────────────────────────────────
    const extractPromise = fetch('/api/extract-graph', { method: 'POST', body: form }).then((r) =>
      r.json(),
    );

    // Feed discoveries as phase A resolves
    analyzePromise.then((analysis) => {
      if (!analysis) return;
      const items: Discovery[] = [
        { icon: '◈', label: 'Topic', value: analysis.topic },
        { icon: '◉', label: 'Core concept', value: analysis.coreConcept },
        { icon: '◌', label: 'Concepts found', value: `~${analysis.conceptCount} distinct concepts` },
        ...(analysis.themes.slice(0, 2).map((t) => ({
          icon: '◦',
          label: 'Theme',
          value: t,
        }))),
        { icon: '✦', label: 'Insight', value: analysis.insight },
      ];
      items.forEach((item, i) => addDiscovery(item, i * 420));
      setTimeout(() => setAnalysisDone(true), items.length * 420 + 300);
    });

    try {
      const data = (await extractPromise) as { graph?: GraphData; error?: string };

      if (phaseInterval) clearInterval(phaseInterval);
      discoveryTimers.current.forEach(clearTimeout);

      if (!data.graph) {
        throw new Error(data.error ?? 'Extraction failed');
      }

      // Save to user's collection and legacy key
      if (session) void saveGraph(session.userId, data.graph);

      setPhaseIdx(EXTRACT_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/graph/${data.graph.id}`);
    } catch (err) {
      if (phaseInterval) clearInterval(phaseInterval);
      discoveryTimers.current.forEach(clearTimeout);
      const msg = err instanceof Error ? err.message : String(err);
      setExtractError(msg);
      setStep(2);
      setIsLoading(false);
    }
  }, [canGenerate, isLoading, text, activeTab, droppedFile, router, addDiscovery]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      setDroppedFile(file);
      setActiveTab('pdf');
    }
  }, []);

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Step indicator + Skip ────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 pt-6">
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: step === s ? 24 : 8,
                height: 8,
                background: step >= s ? 'var(--accent-primary)' : 'var(--border-default)',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => router.push('/home')}
          className="text-[12px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          Skip →
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════════════════════════
            Step 1 — Explore the sample graph
        ════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 relative">
              <HeroGraph />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 text-center"
              >
                <p className="text-[11px] tracking-[0.10em] uppercase font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
                  Sample graph · Machine Learning
                </p>
                <p className="font-light tracking-tight text-[32px] leading-tight" style={{ color: 'var(--text-primary)' }}>
                  This is what your notes become.
                </p>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[12px] whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                Click any node to explore its connections
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex-shrink-0 flex flex-col items-center gap-3 pb-10 pt-6 px-8"
              style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-base)' }}
            >
              <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>
                Your graph will map <em>your</em> ideas, automatically.
              </p>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 h-11 px-6 rounded-[8px] text-[13px] font-medium text-white transition-colors"
                style={{ background: 'var(--accent-primary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
              >
                Upload my notes <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            Step 2 — Upload notes
        ════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="h-full flex flex-col items-center justify-center px-8 pt-20 pb-8"
          >
            <div className="w-full max-w-[560px] flex flex-col gap-6">
              <div className="text-center">
                <h1 className="font-light tracking-tight text-[36px] leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                  Upload your first notes.
                </h1>
                <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                  Paste text, a lecture transcript, or drop a PDF.
                </p>
              </div>

              <div
                className="rounded-[16px] overflow-hidden"
                style={{ background: 'var(--bg-surface-1)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex border-b" style={{ borderColor: 'var(--border-default)' }}>
                  {(['text', 'pdf'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-colors flex-1 justify-center"
                      style={{
                        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        background: 'transparent',
                      }}
                    >
                      {tab === 'text' ? <FileText size={13} /> : <Upload size={13} />}
                      {tab === 'text' ? 'Paste text' : 'Upload PDF'}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {activeTab === 'text' ? (
                      <motion.div
                        key="text-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col gap-2"
                      >
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Paste your notes here… lecture transcripts, research summaries, articles, anything. The AI will find the structure."
                          rows={8}
                          className="w-full resize-none rounded-[10px] p-4 text-[14px] leading-relaxed outline-none"
                          style={{
                            background: 'var(--bg-surface-2)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                            caretColor: 'var(--accent-primary)',
                          }}
                          onFocus={(e) => {
                            e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)';
                            e.target.style.borderColor = 'var(--accent-primary)';
                          }}
                          onBlur={(e) => {
                            e.target.style.boxShadow = 'none';
                            e.target.style.borderColor = 'var(--border-default)';
                          }}
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Try a chapter from a textbook, a meeting transcript, or your own notes.
                          </span>
                          <span className="text-[11px] tabular-nums flex-shrink-0 ml-4" style={{ color: 'var(--text-secondary)' }}>
                            {text.length} chars
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pdf-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-4 py-12 rounded-[10px] border-2 border-dashed cursor-pointer transition-colors"
                          style={{
                            borderColor: isDragging
                              ? 'var(--accent-primary)'
                              : droppedFile
                                ? '#38A870'
                                : 'var(--border-default)',
                            background: isDragging ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                          }}
                        >
                          {droppedFile ? (
                            <div className="flex flex-col items-center gap-2 text-center">
                              <FileText size={28} color="#38A870" />
                              <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                {droppedFile.name}
                              </p>
                              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                                {(droppedFile.size / 1024 / 1024).toFixed(1)} MB · ready
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDroppedFile(null);
                                }}
                                className="flex items-center gap-1 text-[12px] transition-colors mt-1"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                              >
                                <X size={12} /> Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                              <div className="text-center">
                                <p className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Drop a PDF here</p>
                                <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>or click to browse</p>
                              </div>
                            </>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setDroppedFile(f);
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isLoading}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition-all"
                style={{
                  background: canGenerate && !isLoading ? 'var(--accent-primary)' : 'var(--bg-surface-2)',
                  color: canGenerate && !isLoading ? '#FFFFFF' : 'var(--text-muted)',
                  border: canGenerate && !isLoading ? 'none' : '1px solid var(--border-default)',
                  cursor: canGenerate && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    Generate my graph <ArrowRight size={14} />
                  </>
                )}
              </button>

              {extractError ? (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-[10px] text-[12px]"
                  style={{
                    background: '#B0604011',
                    border: '1px solid #B0604033',
                    color: '#D07858',
                  }}
                >
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{extractError}</span>
                </div>
              ) : (
                <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
                  Typically takes 5–15 seconds · your notes are never stored
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            Step 3 — Generating (two-phase: analyze + extract)
        ════════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full flex flex-col items-center justify-center gap-8 px-8"
          >
            {/* Pulsing orb */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute rounded-full"
                style={{ background: 'var(--accent-primary)', opacity: 0.06 }}
                animate={{ width: [80, 160, 80], height: [80, 160, 80] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{ background: 'var(--accent-primary)', opacity: 0.10 }}
                animate={{ width: [60, 100, 60], height: [60, 100, 60] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
              />
              <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-default)' }}
              >
                <Loader2 size={24} style={{ color: 'var(--accent-primary)' }} className="animate-spin" />
              </div>
            </div>

            {/* Current phase message */}
            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phaseIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-[17px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {EXTRACT_PHASES[phaseIdx]}
                </motion.p>
              </AnimatePresence>
              <p className="text-[13px] mt-2" style={{ color: 'var(--text-muted)' }}>Building your knowledge graph…</p>
            </div>

            {/* Progress bar */}
            <div
              className="w-48 h-0.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-surface-3)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--accent-primary)' }}
                animate={{
                  width: `${((phaseIdx + 1) / EXTRACT_PHASES.length) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Discoveries feed */}
            {discoveries.length > 0 && (
              <div className="w-full max-w-[400px] flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-[0.08em] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  Discovered
                </p>
                <AnimatePresence>
                  {discoveries.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="flex items-start gap-2.5 px-3 py-2 rounded-[8px]"
                      style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span className="text-[14px] flex-shrink-0 mt-px" style={{ color: 'var(--accent-primary)' }}>
                        {d.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] mr-1.5" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {analysisDone && discoveries.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] text-[#3D8A6E] mt-1"
                  >
                    ✓ Initial scan complete — building full graph…
                  </motion.p>
                )}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--bg-base)' }} />}>
      <WelcomeContent />
    </Suspense>
  );
}
