'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Observe the hero sentinel — when it leaves viewport, navbar becomes solid
    const sentinel = document.getElementById('hero-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center"
      style={{
        backgroundColor: scrolled ? '#111118' : 'transparent',
        borderBottom: scrolled ? '1px solid #2A2A3F' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background-color 300ms ease-out, border-color 300ms ease-out',
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto px-8 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Notes & Edges home"
        >
          {/* Logo mark — two connected nodes */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4" fill="#4D7FFF" opacity="0.9" />
            <circle cx="17" cy="17" r="4" fill="#4D7FFF" opacity="0.5" />
            <line
              x1="10.5"
              y1="10.5"
              x2="13.5"
              y2="13.5"
              stroke="#4D7FFF"
              strokeWidth="1.5"
              opacity="0.6"
            />
          </svg>
          <span className="text-[15px] font-semibold text-[#F0F0F5] tracking-tight">
            Notes & Edges
          </span>
        </Link>

        {/* Center nav — three links only */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {['Features', 'Pricing', 'Blog'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[13px] text-[#8888AA] hover:text-[#F0F0F5] transition-colors duration-150"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-[13px] text-[#8888AA] hover:text-[#F0F0F5] transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] bg-[#4D7FFF] text-[#F0F0F5] text-[13px] font-medium transition-colors duration-150 hover:bg-[#6290FF] active:bg-[#3D6FEF]"
          >
            Start for free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
