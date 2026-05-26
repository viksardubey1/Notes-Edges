'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { HeroGraph } from './HeroGraph';

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16" aria-label="Hero">
      {/* Sentinel for navbar scroll detection */}
      <div id="hero-sentinel" className="absolute bottom-0 left-0 right-0 h-px" />

      {/* Soft radial glow behind content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 60% 45%, rgba(123,110,196,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[1200px] mx-auto px-8 flex flex-col lg:flex-row items-center gap-16 py-20">
        {/* ── Left column — Copy + CTAs ─────────────────────────────────── */}
        <div className="lg:w-[40%] flex flex-col items-start gap-6 flex-shrink-0">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[11px] font-medium tracking-[0.12em] uppercase"
            style={{ color: '#7B6EC4' }}
          >
            AI-powered knowledge graphs
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-[family-name:var(--font-fraunces)] text-[52px] leading-[1.08] tracking-[-0.01em]"
            style={{ color: '#251E3D' }}
          >
            Your notes,
            <br />
            finally connected.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-[18px] leading-relaxed max-w-[380px]"
            style={{ color: '#5A5272' }}
          >
            Upload your notes. Watch your ideas become a living knowledge graph — automatically.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 mt-2"
          >
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
              style={{ background: '#7B6EC4', color: '#FFFFFF' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#8F82D4'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#7B6EC4'; }}
            >
              Start for free
            </Link>
            <button
              onClick={() => {
                document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
              style={{
                border: '1px solid rgba(123,110,196,0.22)',
                color: '#251E3D',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.06)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.22)';
              }}
            >
              Watch demo
            </button>
          </motion.div>

          {/* Social proof micro-line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-[11px] mt-1"
            style={{ color: '#9C95B5' }}
          >
            No credit card required · Generates your first graph in under 60 seconds
          </motion.p>
        </div>

        {/* ── Right column — Interactive graph ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="lg:w-[60%] w-full aspect-[4/3] relative"
        >
          <div
            className="absolute inset-0 rounded-[16px] overflow-hidden"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 0 0 1px rgba(123,110,196,0.14), 0 20px 60px rgba(37,30,61,0.08), 0 0 60px rgba(123,110,196,0.06)',
            }}
          >
            <HeroGraph />
          </div>

          {/* Floating badge */}
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(245,243,251,0.92)',
              border: '1px solid rgba(123,110,196,0.14)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6EC4' }} />
            <span className="text-[11px] font-medium" style={{ color: '#5A5272' }}>Live interactive graph</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
