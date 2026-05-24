'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

const TIERS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Start exploring your knowledge.',
    features: ['5 knowledge graphs', '100 nodes per graph', 'PDF & text upload'],
    cta: 'Get started free',
    href: '/signup',
    recommended: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 12,
    annualPrice: 9,
    description: 'For serious thinkers and researchers.',
    features: ['Unlimited graphs', '1,000 nodes per graph', 'AI concept summaries + semantic search'],
    cta: 'Start Pro trial',
    href: '/signup?plan=pro',
    recommended: true,
  },
  {
    name: 'Team',
    monthlyPrice: 32,
    annualPrice: 24,
    description: 'Collaborative knowledge infrastructure.',
    features: ['Everything in Pro', 'Collaborative graphs', 'API access + SSO'],
    cta: 'Contact us',
    href: '/signup?plan=team',
    recommended: false,
  },
] as const;

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-28 px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[11px] text-[#4D7FFF] tracking-[0.12em] uppercase font-medium mb-4">
            Pricing
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[40px] text-[#F0F0F5] leading-tight mb-8">
            Start free. Grow forever.
          </h2>

          {/* Annual/Monthly toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-[10px]"
            style={{ background: '#111118', border: '1px solid #2A2A3F' }}>
            <button
              onClick={() => setAnnual(false)}
              className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150"
              style={{
                background: !annual ? '#1A1A26' : 'transparent',
                color: !annual ? '#F0F0F5' : '#8888AA',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150"
              style={{
                background: annual ? '#1A1A26' : 'transparent',
                color: annual ? '#F0F0F5' : '#8888AA',
              }}
            >
              Annual
              <span className="text-[10px] text-[#4D7FFF] font-medium">–25%</span>
            </button>
          </div>
        </motion.div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col p-8 rounded-[16px] relative"
                style={{
                  background: '#111118',
                  border: tier.recommended
                    ? '1px solid #4D7FFF'
                    : '1px solid #2A2A3F',
                  boxShadow: tier.recommended
                    ? '0 0 40px rgba(77,127,255,0.08)'
                    : 'none',
                }}
              >
                {/* Recommended badge */}
                {tier.recommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-medium text-[#F0F0F5]"
                    style={{ background: '#4D7FFF' }}
                  >
                    Recommended
                  </div>
                )}

                {/* Tier info */}
                <div className="mb-8">
                  <h3 className="text-[17px] font-medium text-[#F0F0F5] mb-1">{tier.name}</h3>
                  <p className="text-[13px] text-[#8888AA] mb-6">{tier.description}</p>

                  {/* Price */}
                  <div className="flex items-end gap-1">
                    <span className="font-[family-name:var(--font-fraunces)] text-[40px] text-[#F0F0F5] leading-none">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-[13px] text-[#8888AA] mb-1">
                        / mo{annual ? ' · billed annually' : ''}
                      </span>
                    )}
                    {price === 0 && (
                      <span className="text-[13px] text-[#8888AA] mb-1">forever</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        color={tier.recommended ? '#4D7FFF' : '#3D8A6E'}
                        className="flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-[#8888AA]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className="flex items-center justify-center h-10 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
                  style={{
                    background: tier.recommended ? '#4D7FFF' : 'transparent',
                    color: '#F0F0F5',
                    border: tier.recommended ? 'none' : '1px solid #2A2A3F',
                  }}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
