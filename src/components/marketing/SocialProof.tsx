'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote:
      "I uploaded three months of research papers and had a complete knowledge map in under a minute. I found conceptual connections I'd completely missed — across papers I'd read six months apart.",
    name: 'Amara Osei',
    role: 'PhD Candidate, Cognitive Neuroscience',
    initials: 'AO',
  },
  {
    quote:
      "This is the first tool that actually maps how I think. Not how I write, not how I organize files — how I actually think. The graph after my first upload felt like looking at my own brain.",
    name: 'Marcus Vidal',
    role: 'Founder, early-stage AI startup',
    initials: 'MV',
  },
  {
    quote:
      "I've tried Roam, Obsidian, Notion, and Logseq. Notes & Edges is the first one that feels like it belongs to the future. The graph just appears — you don't build it, you discover it.",
    name: 'Priya Krishnaswamy',
    role: 'Technical Writer & Second-brain Enthusiast',
    initials: 'PK',
  },
  {
    quote:
      "My literature review used to take weeks of manually connecting ideas. Now I upload my annotations and the graph shows me the shape of the entire research field in seconds.",
    name: 'Jakub Nowak',
    role: 'Academic Researcher, Computer Vision',
    initials: 'JN',
  },
];

export function SocialProof() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-4" style={{ color: '#7B6EC4' }}>
            From the community
          </p>
          <h2
            className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight"
            style={{ color: '#251E3D' }}
          >
            When it clicks, it really clicks.
          </h2>
        </motion.div>
      </div>

      {/* Horizontally scrollable testimonials */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #F5F3FB, transparent)' }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #F5F3FB, transparent)' }} />

        <div className="flex gap-6 overflow-x-auto px-8 pb-4 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex-shrink-0 w-[320px] flex flex-col justify-between gap-6 p-7 rounded-[14px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(123,110,196,0.14)' }}
            >
              {/* Quote mark */}
              <div>
                <svg width="24" height="18" viewBox="0 0 24 18" fill="none" className="mb-4" aria-hidden="true">
                  <path
                    d="M0 18V10.8C0 4.8 3.6 1.2 10.8 0L12 2.4C8.4 3.6 6.6 5.6 6.6 8.4H10.8V18H0ZM13.2 18V10.8C13.2 4.8 16.8 1.2 24 0L25.2 2.4C21.6 3.6 19.8 5.6 19.8 8.4H24V18H13.2Z"
                    fill="rgba(123,110,196,0.18)"
                  />
                </svg>
                <p className="text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(123,110,196,0.08)', border: '1px solid rgba(123,110,196,0.14)' }}
                >
                  <span className="text-[11px] font-medium" style={{ color: '#7B6EC4' }}>{t.initials}</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: '#251E3D' }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: '#9C95B5' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
