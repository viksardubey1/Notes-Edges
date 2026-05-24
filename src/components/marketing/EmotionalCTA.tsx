'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function EmotionalCTA() {
  return (
    <section
      className="py-40 px-8 text-center relative overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* Ambient graph glow behind the text */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(77,127,255,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[680px] mx-auto flex flex-col items-center gap-10">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="font-[family-name:var(--font-fraunces)] text-[48px] md:text-[56px] text-[#F0F0F5] leading-[1.1] tracking-[-0.01em]"
        >
          You&apos;ve been thinking in lines.
          <br />
          Start thinking in graphs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-12 px-8 rounded-[8px] bg-[#4D7FFF] text-[#F0F0F5] text-[15px] font-medium transition-colors duration-150 hover:bg-[#6290FF] active:bg-[#3D6FEF]"
          >
            Start for free
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
