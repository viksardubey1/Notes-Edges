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
          <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-4" style={{ color: '#7B6EC4' }}>
            Pricing
          </p>
          <h2
            className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight mb-8"
            style={{ color: '#251E3D' }}
          >
            Start free. Grow forever.
          </h2>

          {/* Annual/Monthly toggle */}
          <div
            className="inline-flex items-center gap-1 p-1 rounded-[10px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(123,110,196,0.14)' }}
          >
            <button
              onClick={() => setAnnual(false)}
              className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150"
              style={{
                background: !annual ? 'rgba(123,110,196,0.10)' : 'transparent',
                color: !annual ? '#251E3D' : '#9C95B5',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-150"
              style={{
                background: annual ? 'rgba(123,110,196,0.10)' : 'transparent',
                color: annual ? '#251E3D' : '#9C95B5',
              }}
            >
              Annual
              <span className="text-[10px] font-medium" style={{ color: '#7B6EC4' }}>–25%</span>
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
                  background: '#FFFFFF',
                  border: tier.recommended
                    ? '1px solid #7B6EC4'
                    : '1px solid rgba(123,110,196,0.14)',
                  boxShadow: tier.recommended
                    ? '0 0 40px rgba(123,110,196,0.10)'
                    : 'none',
                }}
              >
                {/* Recommended badge */}
                {tier.recommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: '#7B6EC4', color: '#FFFFFF' }}
                  >
                    Recommended
                  </div>
                )}

                {/* Tier info */}
                <div className="mb-8">
                  <h3 className="text-[17px] font-medium mb-1" style={{ color: '#251E3D' }}>{tier.name}</h3>
                  <p className="text-[13px] mb-6" style={{ color: '#5A5272' }}>{tier.description}</p>

                  <div className="flex items-end gap-1">
                    <span className="font-[family-name:var(--font-fraunces)] text-[40px] leading-none" style={{ color: '#251E3D' }}>
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-[13px] mb-1" style={{ color: '#9C95B5' }}>
                        / mo{annual ? ' · billed annually' : ''}
                      </span>
                    )}
                    {price === 0 && (
                      <span className="text-[13px] mb-1" style={{ color: '#9C95B5' }}>forever</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        color={tier.recommended ? '#7B6EC4' : '#3FA882'}
                        className="flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-[13px]" style={{ color: '#5A5272' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className="flex items-center justify-center h-10 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
                  style={{
                    background: tier.recommended ? '#7B6EC4' : 'transparent',
                    color: tier.recommended ? '#FFFFFF' : '#251E3D',
                    border: tier.recommended ? 'none' : '1px solid rgba(123,110,196,0.22)',
                  }}
                  onMouseEnter={(e) => {
                    if (tier.recommended) (e.currentTarget as HTMLAnchorElement).style.background = '#8F82D4';
                    else (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(123,110,196,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (tier.recommended) (e.currentTarget as HTMLAnchorElement).style.background = '#7B6EC4';
                    else (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
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
