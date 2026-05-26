/**
 * Auth Layout — Notes & Edges
 * Used by: /login, /signup
 */

import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 90% 75% at 48% 42%, rgba(255,155,140,0.15) 0%, rgba(255,200,190,0.08) 45%, transparent 65%), radial-gradient(ellipse 60% 55% at 75% 75%, rgba(123,110,196,0.07) 0%, transparent 55%), #FEF8F7',
      }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(123,110,196,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.4,
        }}
        aria-hidden="true"
      />

      {/* Back to landing */}
      <Link
        href="/"
        className="absolute top-5 left-6 flex items-center gap-2 transition-opacity hover:opacity-70"
        aria-label="Back to home"
      >
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #8855CC 0%, #E8607A 100%)' }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <line x1="4.7" y1="5.4" x2="7.7" y2="3.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
            <line x1="4.7" y1="6.6" x2="7.7" y2="8.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
            <circle cx="3" cy="6" r="1.8" fill="white" opacity="0.95" />
            <circle cx="9" cy="3" r="1.4" fill="white" opacity="0.85" />
            <circle cx="9" cy="9" r="1.4" fill="white" opacity="0.85" />
          </svg>
        </div>
        <span className="text-[13px] font-medium" style={{ color: '#5A5272' }}>Notes & Edges</span>
      </Link>

      {/* Card */}
      <div
        className="relative w-full max-w-[400px] mx-6 px-8 py-9 rounded-[20px]"
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(123,110,196,0.14)',
          boxShadow: '0 8px 48px rgba(123,110,196,0.10), 0 2px 8px rgba(37,30,61,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
