'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_TEXT = `Photosynthesis converts light energy into chemical energy stored in glucose. Chlorophyll absorbs sunlight in the chloroplasts. The Calvin cycle uses CO₂ from the air to build sugars. Without ATP, no energy transfer is possible.`;

const NODES = [
  { id: 'a', x: 220, y: 130, r: 18, label: 'Photosynthesis', color: '#7B6EC4', primary: true },
  { id: 'b', x: 130, y: 210, r: 13, label: 'Chlorophyll', color: '#60C898' },
  { id: 'c', x: 340, y: 200, r: 13, label: 'Calvin Cycle', color: '#C4923A' },
  { id: 'd', x: 160, y: 310, r: 11, label: 'Chloroplasts', color: '#60C0E8' },
  { id: 'e', x: 310, y: 310, r: 11, label: 'ATP', color: '#E06070' },
  { id: 'f', x: 420, y: 130, r: 11, label: 'Glucose', color: '#9876EE' },
  { id: 'g', x: 100, y: 130, r: 10, label: 'Light Energy', color: '#60C898' },
];

const EDGES = [
  { s: 'a', t: 'b' }, { s: 'a', t: 'c' }, { s: 'a', t: 'f' },
  { s: 'b', t: 'd' }, { s: 'c', t: 'e' }, { s: 'a', t: 'g' },
  { s: 'g', t: 'b' },
];

const STEPS = [
  { id: 'upload', label: 'Paste notes' },
  { id: 'build',  label: 'Graph builds' },
  { id: 'explore', label: 'Explore' },
] as const;

type Step = typeof STEPS[number]['id'];

// ── Sub-components ────────────────────────────────────────────────────────────

function MockCommandBar() {
  return (
    <div className="flex items-center gap-3 px-4 h-10 flex-shrink-0 border-b"
      style={{ background: 'rgba(255,255,255,0.96)', borderColor: 'rgba(123,110,196,0.12)' }}>
      {/* Logo dot */}
      <div className="w-5 h-5 rounded-[5px] flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7B6EC4, #C4923A)' }} />
      <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(123,110,196,0.15)' }} />
      <span className="text-[11px] font-medium" style={{ color: '#251E3D' }}>Photosynthesis — Biology 101</span>
      <div className="flex-1" />
      <div className="h-6 px-3 rounded-[6px] flex items-center text-[10px] font-medium"
        style={{ background: '#7B6EC4', color: '#fff' }}>
        Add notes
      </div>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
        style={{ background: 'rgba(123,110,196,0.10)', color: '#7B6EC4' }}>
        V
      </div>
    </div>
  );
}

function MockSidebar() {
  return (
    <div className="flex flex-col gap-2 p-2 flex-shrink-0 border-r"
      style={{ width: 40, background: 'rgba(255,255,255,0.88)', borderColor: 'rgba(123,110,196,0.10)' }}>
      {['M', 'S', '⚙'].map((icon, i) => (
        <div key={i} className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px]"
          style={{ color: '#9C95B5', background: i === 0 ? 'rgba(123,110,196,0.08)' : 'transparent' }}>
          {icon}
        </div>
      ))}
    </div>
  );
}

function GraphCanvas({ step, selectedNode }: { step: Step; selectedNode: string | null }) {
  const showNodes = step === 'build' || step === 'explore';
  const n = NODES.find(n => n.id === selectedNode);
  const neighborIds = selectedNode
    ? EDGES.filter(e => e.s === selectedNode || e.t === selectedNode).flatMap(e => [e.s, e.t])
    : [];

  return (
    <div className="flex-1 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 70% at 48% 45%, rgba(255,155,140,0.13) 0%, rgba(255,200,190,0.06) 50%, transparent 70%), #FEF8F7' }}>

      {/* Upload state */}
      <AnimatePresence>
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center p-8"
          >
            <div className="w-full max-w-[340px] rounded-[14px] p-5 shadow-sm"
              style={{ background: '#fff', border: '1px solid rgba(123,110,196,0.15)' }}>
              <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-3" style={{ color: '#7B6EC4' }}>
                Your notes
              </p>
              <div className="rounded-[8px] p-3 mb-3 text-[11px] leading-relaxed"
                style={{ background: '#F5F3FB', color: '#5A5272', minHeight: 72 }}>
                <TypingText text={SAMPLE_TEXT} />
              </div>
              <motion.div
                className="w-full h-8 rounded-[8px] flex items-center justify-center text-[11px] font-medium text-white"
                style={{ background: '#7B6EC4' }}
                animate={{ opacity: [1, 0.75, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}>
                Generate graph →
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graph */}
      <AnimatePresence>
        {showNodes && (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <svg width="100%" height="100%" viewBox="0 0 520 420" preserveAspectRatio="xMidYMid meet">
              {/* Edges */}
              {EDGES.map((e, i) => {
                const src = NODES.find(n => n.id === e.s)!;
                const tgt = NODES.find(n => n.id === e.t)!;
                const isHighlit = selectedNode && (e.s === selectedNode || e.t === selectedNode);
                return (
                  <motion.line key={i}
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={isHighlit ? src.color : 'rgba(123,110,196,0.20)'}
                    strokeWidth={isHighlit ? 1.5 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                  />
                );
              })}

              {/* Nodes */}
              {NODES.map((node, i) => {
                const isSelected = node.id === selectedNode;
                const isNeighbor = neighborIds.includes(node.id);
                const dimmed = selectedNode && !isSelected && !isNeighbor;
                return (
                  <motion.g key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: dimmed ? 0.3 : 1 }}
                    transition={{ delay: 0.05 + i * 0.08, duration: 0.35, type: 'spring', stiffness: 280 }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  >
                    {isSelected && (
                      <motion.circle cx={node.x} cy={node.y} r={node.r + 10}
                        fill={node.color} opacity={0.12}
                        animate={{ r: [node.r + 8, node.r + 14, node.r + 8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <circle cx={node.x} cy={node.y} r={node.r}
                      fill={node.color} opacity={isSelected ? 1 : 0.75}
                      stroke={isSelected ? node.color : 'none'}
                      strokeWidth={2}
                    />
                    <text x={node.x} y={node.y + node.r + 9}
                      textAnchor="middle" fontSize="8.5" fill="#5A5272"
                      fontFamily="Geist, sans-serif" fontWeight={isSelected ? '600' : '400'}>
                      {node.label}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MockRightPanel({ node }: { node: typeof NODES[0] | undefined }) {
  if (!node) return null;
  const summaries: Record<string, string> = {
    a: 'Converts light energy into chemical energy stored in glucose using CO₂ and water.',
    b: 'The green pigment in plants that captures sunlight to power photosynthesis.',
    c: 'A series of reactions in the stroma that fix CO₂ into glucose using ATP and NADPH.',
    d: 'Membrane-bound organelles in plant cells where photosynthesis takes place.',
    e: 'The primary energy currency of the cell, powering nearly every biological process.',
    f: 'A simple sugar produced by photosynthesis and used as fuel for cellular respiration.',
    g: 'Electromagnetic radiation from the sun that drives the light-dependent reactions.',
  };

  return (
    <motion.div
      key={node.id}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex-shrink-0 flex flex-col border-l overflow-hidden"
      style={{ width: 180, background: '#FFFFFF', borderColor: 'rgba(123,110,196,0.12)' }}
    >
      {/* Accent strip */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${node.color} 0%, transparent 100%)` }} />

      <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
        {/* Cluster */}
        <span className="text-[8px] font-semibold tracking-[0.10em] uppercase" style={{ color: node.color }}>
          Biology
        </span>

        {/* Title */}
        <h3 className="text-[14px] font-semibold leading-tight" style={{ color: '#251E3D' }}>
          {node.label}
        </h3>

        {/* Summary */}
        <div className="rounded-[8px] p-2.5" style={{ background: `${node.color}10`, borderLeft: `2px solid ${node.color}60` }}>
          <p className="text-[9px] leading-relaxed" style={{ color: '#5A5272' }}>
            {summaries[node.id] ?? ''}
          </p>
        </div>

        {/* Next up label */}
        <div className="mt-auto">
          <p className="text-[8px] font-semibold tracking-[0.10em] uppercase mb-1.5" style={{ color: '#9C95B5' }}>
            Next Up
          </p>
          <div className="rounded-[8px] px-2.5 py-2" style={{ background: 'rgba(123,110,196,0.05)', border: '1px solid rgba(123,110,196,0.12)' }}>
            <p className="text-[10px] font-medium truncate" style={{ color: '#251E3D' }}>
              {NODES.find(n => n.id !== node.id)?.label}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}<span className="inline-block w-px h-3 ml-px align-middle" style={{ background: '#7B6EC4', animation: 'blink 1s step-end infinite' }} /></span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function DemoSection() {
  const [step, setStep] = useState<Step>('upload');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Auto-advance
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep('build'), 3200),
      setTimeout(() => { setStep('explore'); setSelectedNode('a'); }, 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleStepClick = (s: Step) => {
    setStep(s);
    setSelectedNode(s === 'explore' ? 'a' : null);
  };

  const selectedNodeData = NODES.find(n => n.id === selectedNode);

  return (
    <section id="demo" className="py-24 px-8">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-4" style={{ color: '#7B6EC4' }}>
            See it in action
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight" style={{ color: '#251E3D' }}>
            From notes to knowledge in seconds.
          </h2>
        </motion.div>

        {/* Step tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center gap-2 mb-6"
        >
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleStepClick(s.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-200"
              style={{
                background: step === s.id ? '#7B6EC4' : 'rgba(123,110,196,0.08)',
                color: step === s.id ? '#fff' : '#7B6EC4',
                border: step === s.id ? 'none' : '1px solid rgba(123,110,196,0.18)',
              }}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: step === s.id ? 'rgba(255,255,255,0.20)' : 'rgba(123,110,196,0.15)' }}>
                {i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* App window */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-[16px] overflow-hidden"
          style={{
            boxShadow: '0 0 0 1px rgba(123,110,196,0.14), 0 24px 64px rgba(37,30,61,0.10), 0 0 80px rgba(123,110,196,0.06)',
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-4 h-9 flex-shrink-0"
            style={{ background: '#F0EEF8', borderBottom: '1px solid rgba(123,110,196,0.10)' }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFB3AE' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFD980' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#A8E6CF' }} />
            <div className="flex-1 mx-4">
              <div className="max-w-[200px] mx-auto h-5 rounded-[4px] flex items-center px-2"
                style={{ background: 'rgba(123,110,196,0.08)' }}>
                <span className="text-[9px]" style={{ color: '#9C95B5' }}>notesandedges.app</span>
              </div>
            </div>
          </div>

          {/* App UI */}
          <div className="flex flex-col" style={{ height: 420 }}>
            <MockCommandBar />
            <div className="flex flex-1 overflow-hidden">
              <MockSidebar />
              <GraphCanvas step={step} selectedNode={selectedNode} />
              <AnimatePresence>
                {step === 'explore' && selectedNodeData && (
                  <MockRightPanel node={selectedNodeData} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-[12px] mt-5"
          style={{ color: '#9C95B5' }}
        >
          This is your actual graph. Click any concept and the knowledge panel opens instantly.
        </motion.p>
      </div>
    </section>
  );
}
