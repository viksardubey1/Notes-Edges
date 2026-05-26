'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const container = document.getElementById('marketing-scroll');
    if (!container) return;
    const handler = () => setScrolled(container.scrollTop > 20);
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(123,110,196,0.14)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background-color 300ms ease-out, border-color 300ms ease-out',
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Notes & Edges home">
          <Logo size={30} fontSize={15} />
        </Link>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-[13px] transition-colors duration-150"
            style={{ color: '#9C95B5' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#251E3D'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9C95B5'; }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] text-[13px] font-medium transition-colors duration-150"
            style={{ background: '#7B6EC4', color: '#FFFFFF' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#8F82D4'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#7B6EC4'; }}
          >
            Start for free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
