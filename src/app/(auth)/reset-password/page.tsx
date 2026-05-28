'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { resetPassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const result = await resetPassword(password);
    setLoading(false);

    if (!result.ok) { setError(result.error); return; }

    router.push('/login?reset=success');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="mb-1">
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Choose a new password</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>Must be at least 6 characters.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>New password</label>
        <div className="relative">
          <input
            id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" autoFocus
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="h-11 px-4 pr-12 w-full rounded-[8px] text-[14px] outline-none transition-shadow"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
            onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
            onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--border-default)'; }}
          />
          <button
            type="button" onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Confirm new password</label>
        <input
          id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          className="h-11 px-4 w-full rounded-[8px] text-[14px] outline-none transition-shadow"
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
        {loading ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : 'Set new password'}
      </button>
    </form>
  );
}
