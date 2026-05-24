'use client';

import { motion } from 'framer-motion';
import { Sparkles, GitMerge, Infinity } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    headline: 'Concepts surface themselves.',
    description:
      'Claude reads your notes and extracts the ideas that matter. Every key concept becomes a node — no tagging, no manual linking, no configuration.',
  },
  {
    icon: GitMerge,
    headline: 'Relationships you never saw.',
    description:
      'Semantic similarity finds connections across your entire knowledge base. Ideas from different documents discover each other — because they should.',
  },
  {
    icon: Infinity,
    headline: 'Grows every time you add.',
    description:
      'Each new upload expands the graph. New nodes emerge from the center and find their place among what you already know. Your graph is never finished.',
  },
] as const;

export function FeatureHighlights() {
  return (
    <section id="features-detail" className="py-28 px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-[11px] text-[#4D7FFF] tracking-[0.12em] uppercase font-medium mb-4">
            What makes it different
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[40px] text-[#F0F0F5] leading-tight">
            The graph does the work.
          </h2>
        </motion.div>

        {/* Three feature cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-5"
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-[12px] flex items-center justify-center"
                  style={{ background: '#111118', border: '1px solid #2A2A3F' }}
                >
                  <Icon size={28} color="#4D7FFF" strokeWidth={1.5} aria-hidden="true" />
                </div>

                {/* Copy */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-[17px] font-medium text-[#F0F0F5] leading-snug">
                    {feature.headline}
                  </h3>
                  <p className="text-[14px] text-[#8888AA] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
