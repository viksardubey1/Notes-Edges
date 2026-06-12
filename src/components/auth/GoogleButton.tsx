'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth';

interface GoogleButtonProps {
  label?: string;
}

export function GoogleButton({ label = 'Continue with Google' }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    // signInWithGoogle triggers a full-page redirect, so loading stays true until navigation
    await signInWithGoogle();
    // If we somehow get here (pop-up blocked, etc.) reset the state
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={label}
      className="relative w-full h-11 flex items-center justify-center gap-3 rounded-[8px] text-[13px] font-medium transition-all duration-150"
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        boxShadow: '0 1px 2px rgba(37,30,61,0.06)',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,110,196,0.28)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-1)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {loading ? (
        <div className="w-[17px] h-[17px] rounded-[4px] bg-[#EEEAF8] animate-[shimmer-opacity_1.8s_infinite]" />
      ) : (
        <GoogleLogo />
      )}
      <span className={loading ? 'animate-[shimmer-opacity_1.8s_infinite]' : ''}>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
