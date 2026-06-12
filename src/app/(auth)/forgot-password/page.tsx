'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { forgotPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required.'); return; }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (!result.ok) { setError(result.error); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="mb-1">
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Check your email</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            If an account exists for <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{email}</span>,
            you'll receive a reset link shortly. The link expires in 30 minutes.
          </p>
        </div>
        <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
          <Link href="/login" className="flex items-center justify-center gap-1.5 transition-colors" style={{ color: 'var(--accent-primary)' }}>
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="mb-1">
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Reset your password</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Email address</label>
        <input
          id="email" type="email" autoComplete="email" autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 px-4 rounded-[8px] text-[14px] outline-none transition-shadow"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
          onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
          onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
        />
      </div>

      {error && (
        <div className="px-3 py-2.5 rounded-[8px] text-[12px]"
          style={{ background: 'rgba(224,88,120,0.10)', border: '1px solid rgba(224,88,120,0.30)', color: '#E05878' }}
          role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="h-11 flex items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium text-white transition-colors"
        style={{ background: 'var(--accent-primary)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
      >
        {loading ? <span className="animate-[shimmer-opacity_2.4s_ease-in-out_infinite]">Sending…</span> : 'Send reset link'}
      </button>

      <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
        <Link href="/login" className="flex items-center justify-center gap-1.5 transition-colors" style={{ color: 'var(--accent-primary)' }}>
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </p>
    </form>
  );
}
