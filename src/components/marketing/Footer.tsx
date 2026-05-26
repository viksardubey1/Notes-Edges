'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export function Footer() {
  return (
    <footer className="py-8 px-8 border-t" style={{ borderColor: 'rgba(123,110,196,0.14)' }}>
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Logo size={24} fontSize={13} textColor="#5A5272" />

        {/* Links */}
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[12px] transition-colors duration-150"
              style={{ color: '#9C95B5' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#5A5272'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9C95B5'; }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-[11px]" style={{ color: '#9C95B5' }}>
          © {new Date().getFullYear()} Notes & Edges
        </p>
      </div>
    </footer>
  );
}
