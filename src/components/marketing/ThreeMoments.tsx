'use client';

import { motion } from 'framer-motion';

const MOMENTS = [
  {
    step: '01',
    title: 'Upload your notes',
    description: 'Drop a PDF, paste text, or link a URL. One action. Nothing more.',
    visual: <UploadVisual />,
  },
  {
    step: '02',
    title: 'AI finds the connections',
    description: 'Concepts emerge. Relationships form. The graph builds itself before your eyes.',
    visual: <BuildVisual />,
  },
  {
    step: '03',
    title: 'Explore, expand, understand',
    description: 'Click any idea. See its world. Add more notes — the graph grows smarter.',
    visual: <ExploreVisual />,
  },
];

export function ThreeMoments() {
  return (
    <section id="features" className="py-28 px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-4" style={{ color: '#7B6EC4' }}>
            How it works
          </p>
          <h2
            className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight"
            style={{ color: '#251E3D' }}
          >
            Three moments. One understanding.
          </h2>
        </motion.div>

        {/* Three panels */}
        <div className="grid md:grid-cols-3 gap-6">
          {MOMENTS.map((moment, i) => (
            <motion.div
              key={moment.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col gap-6 p-8 rounded-[16px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(123,110,196,0.14)' }}
            >
              {/* Visual illustration */}
              <div
                className="w-full aspect-[4/3] rounded-[10px] flex items-center justify-center overflow-hidden"
                style={{ background: '#F5F3FB' }}
              >
                {moment.visual}
              </div>

              {/* Step number */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium tracking-[0.10em] uppercase" style={{ color: '#7B6EC4' }}>
                  Step {moment.step}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(123,110,196,0.14)' }} />
              </div>

              {/* Copy */}
              <div>
                <h3 className="text-[17px] font-medium mb-2" style={{ color: '#251E3D' }}>{moment.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>{moment.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Micro-illustrations ──────────────────────────────────────────────────────

function UploadVisual() {
  return (
    <svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true">
      {/* Upload zone */}
      <rect x="40" y="30" width="160" height="120" rx="10"
        fill="none" stroke="rgba(123,110,196,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* Upload arrow */}
      <motion.g
        initial={{ y: 6, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <line x1="120" y1="100" x2="120" y2="60" stroke="#7B6EC4" strokeWidth="1.5" />
        <polyline points="108,72 120,60 132,72" fill="none" stroke="#7B6EC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* PDF icon */}
      <motion.g
        initial={{ y: 8, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <rect x="98" y="108" width="44" height="30" rx="4" fill="rgba(123,110,196,0.06)" stroke="rgba(123,110,196,0.20)" strokeWidth="1" />
        <text x="120" y="128" textAnchor="middle" fill="#9C95B5" fontSize="9" fontFamily="Geist, sans-serif" fontWeight="500">PDF</text>
      </motion.g>

      <text x="120" y="160" textAnchor="middle" fill="#9C95B5" fontSize="10" fontFamily="Geist, sans-serif">
        Drop anything here
      </text>
    </svg>
  );
}

function BuildVisual() {
  const nodePositions = [
    { cx: 80, cy: 90, r: 8 },
    { cx: 120, cy: 60, r: 12 },
    { cx: 160, cy: 90, r: 7 },
    { cx: 140, cy: 130, r: 8 },
    { cx: 100, cy: 130, r: 7 },
  ];

  const edges = [
    { x1: 80, y1: 90, x2: 120, y2: 60 },
    { x1: 120, y1: 60, x2: 160, y2: 90 },
    { x1: 160, y1: 90, x2: 140, y2: 130 },
    { x1: 140, y1: 130, x2: 100, y2: 130 },
    { x1: 100, y1: 130, x2: 80, y2: 90 },
    { x1: 120, y1: 60, x2: 140, y2: 130 },
  ];

  return (
    <svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true">
      {edges.map((e, i) => (
        <motion.path
          key={i}
          d={`M ${e.x1},${e.y1} L ${e.x2},${e.y2}`}
          stroke="rgba(123,110,196,0.28)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
        />
      ))}

      {nodePositions.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.cx} cy={n.cy} r={n.r}
          fill="#FFFFFF"
          stroke={i === 1 ? '#7B6EC4' : 'rgba(123,110,196,0.35)'}
          strokeWidth={i === 1 ? 1.5 : 1}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300 }}
          style={{ originX: `${n.cx}px`, originY: `${n.cy}px` }}
        />
      ))}

      {/* Pulsing building indicator */}
      <motion.circle
        cx="120" cy="60" r="18"
        fill="none"
        stroke="#7B6EC4"
        strokeWidth="1"
        opacity="0.3"
        animate={{ r: [18, 26, 18], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <text x="120" y="160" textAnchor="middle" fill="#9C95B5" fontSize="10" fontFamily="Geist, sans-serif">
        AI mapping concepts…
      </text>
    </svg>
  );
}

function ExploreVisual() {
  return (
    <svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true">
      {/* Dimmed outer nodes */}
      {[
        { cx: 60, cy: 50, r: 6 },
        { cx: 190, cy: 55, r: 7 },
        { cx: 40, cy: 140, r: 5 },
        { cx: 195, cy: 145, r: 6 },
      ].map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={n.r}
          fill="rgba(123,110,196,0.04)" stroke="rgba(123,110,196,0.15)" strokeWidth="1" opacity="0.5" />
      ))}

      {/* Dimmed outer edges */}
      {[
        [60, 50, 120, 90], [190, 55, 165, 90], [40, 140, 90, 120], [195, 145, 155, 120],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(123,110,196,0.15)" strokeWidth="0.8" opacity="0.4" />
      ))}

      {/* Neighbor edges */}
      {[
        [120, 90, 90, 120], [120, 90, 155, 120], [120, 90, 120, 55],
      ].map(([x1, y1, x2, y2], i) => (
        <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#7B6EC4" strokeWidth="1.5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
        />
      ))}

      {/* Neighbor nodes */}
      {[
        { cx: 90, cy: 120, r: 8 },
        { cx: 155, cy: 120, r: 9 },
        { cx: 120, cy: 55, r: 7 },
      ].map((n, i) => (
        <motion.circle key={i} cx={n.cx} cy={n.cy} r={n.r}
          fill="#FFFFFF" stroke="rgba(123,110,196,0.35)" strokeWidth="1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
        />
      ))}

      {/* Selected hub */}
      <motion.circle cx="120" cy="90" r="16"
        fill="rgba(123,110,196,0.12)"
        initial={{ r: 10, opacity: 0 }}
        whileInView={{ r: 22, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
      />
      <circle cx="120" cy="90" r="14" fill="#7B6EC4" stroke="#7B6EC4" strokeWidth="2" />

      <text x="120" y="160" textAnchor="middle" fill="#9C95B5" fontSize="10" fontFamily="Geist, sans-serif">
        Focus on what matters
      </text>
    </svg>
  );
}
