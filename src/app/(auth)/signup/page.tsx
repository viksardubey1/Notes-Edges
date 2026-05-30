'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signUp } from '@/lib/auth';
import { GoogleButton } from '@/components/auth/GoogleButton';
import posthog from 'posthog-js';

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  // Handle errors forwarded from the OAuth callback
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_failed') setError('Google sign-in failed. Please try again.');
    else if (err === 'missing_code') setError('Authentication was cancelled. Please try again.');
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);

    const result = await signUp(email, password, name.trim());
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    posthog.identify(result.session.userId, {
      email: result.session.email,
      name: result.session.name,
    });
    posthog.capture('user_signed_up', {
      method: 'email',
    });

    if (result.emailConfirmationRequired) {
      // Supabase requires email confirmation — show message, don't redirect yet
      setConfirmEmail(result.session.email);
      setLoading(false);
      return;
    }

    router.push('/welcome?step=2');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="mb-1">
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Start thinking in graphs — it&apos;s free.
        </p>
      </div>

      {/* Google OAuth */}
      <GoogleButton label="Sign up with Google" />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Your name</label>
        <input
          id="name" type="text" autoComplete="name" autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Alex Chen"
          className="h-11 px-4 rounded-[8px] text-[14px] outline-none transition-shadow"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
          onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
          onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Email address</label>
        <input
          id="email" type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 px-4 rounded-[8px] text-[14px] outline-none transition-shadow"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
          onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
          onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
        <div className="relative">
          <input
            id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="h-11 px-4 pr-12 w-full rounded-[8px] text-[14px] outline-none transition-shadow"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
            onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
            onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
          />
          <button type="button" onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {confirmEmail && (
        <div className="px-3 py-3 rounded-[8px] text-[12px] flex flex-col gap-1"
          style={{ background: 'rgba(78,180,130,0.10)', border: '1px solid rgba(78,180,130,0.30)', color: '#3A9870' }}
          role="status" aria-live="polite">
          <span className="font-medium">Check your email</span>
          <span style={{ color: '#5A7268' }}>
            We sent a confirmation link to <strong>{confirmEmail}</strong>. Click it to activate your account and start using Notes & Edges.
          </span>
        </div>
      )}

      {error && (
        <div className="px-3 py-2.5 rounded-[8px] text-[12px]"
          style={{ background: 'rgba(224,88,120,0.10)', border: '1px solid rgba(224,88,120,0.30)', color: '#E05878' }}
          role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="h-11 flex items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium text-white transition-colors"
        style={{ background: 'var(--accent-primary)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}>
        {loading ? <><Loader2 size={14} className="animate-spin" /> Creating account…</> : 'Create account with email'}
      </button>

      <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" className="transition-colors" style={{ color: 'var(--accent-primary)' }}>Sign in</Link>
      </p>
    </form>
  );
}
