'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { HeroGraph } from './HeroGraph';

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-16"
      aria-label="Hero"
    >
      {/* Sentinel for navbar scroll detection */}
      <div id="hero-sentinel" className="absolute bottom-0 left-0 right-0 h-px" />

      <div className="w-full max-w-[1200px] mx-auto px-8 flex flex-col lg:flex-row items-center gap-16 py-20">
        {/* ── Left column (40%) — Copy + CTAs ───────────────────────────── */}
        <div className="lg:w-[40%] flex flex-col items-start gap-6 flex-shrink-0">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[11px] font-medium text-[#4D7FFF] tracking-[0.12em] uppercase"
          >
            AI-powered knowledge graphs
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-[family-name:var(--font-fraunces)] text-[52px] leading-[1.08] text-[#F0F0F5] tracking-[-0.01em]"
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
            className="text-[18px] text-[#8888AA] leading-relaxed max-w-[380px]"
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
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-[#4D7FFF] text-[#F0F0F5] text-[13px] font-medium transition-colors duration-150 hover:bg-[#6290FF] active:bg-[#3D6FEF]"
            >
              Start for free
            </Link>
            <Link
              href="/welcome"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] border border-[#2A2A3F] text-[#F0F0F5] text-[13px] font-medium transition-colors duration-150 hover:bg-[#1A1A26] hover:border-[#3A3A5C]"
            >
              Watch demo — 90 sec
            </Link>
          </motion.div>

          {/* Social proof micro-line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-[11px] text-[#4A4A6A] mt-1"
          >
            No credit card required · Generates your first graph in under 60 seconds
          </motion.p>
        </div>

        {/* ── Right column (60%) — Interactive graph ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="lg:w-[60%] w-full aspect-[4/3] relative"
          aria-hidden="false"
        >
          {/* Graph container with subtle border glow */}
          <div
            className="absolute inset-0 rounded-[16px] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #111118 0%, #0A0A0F 100%)',
              boxShadow: '0 0 0 1px #2A2A3F, 0 32px 80px rgba(0,0,0,0.6), 0 0 80px rgba(77,127,255,0.04)',
            }}
          >
            <HeroGraph />
          </div>

          {/* Floating "Live graph" badge */}
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: '#1A1A26', border: '1px solid #2A2A3F' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4D7FFF]" />
            <span className="text-[11px] text-[#8888AA] font-medium">Live interactive graph</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
