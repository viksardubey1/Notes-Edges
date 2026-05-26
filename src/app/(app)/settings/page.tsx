'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LogOut, ArrowLeft, User, Database, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { signOut, updateDisplayName } from '@/lib/auth';
import { KEYBOARD_SHORTCUTS } from '@/types/ui';

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="w-16 h-16 rounded-[20px] flex items-center justify-center flex-shrink-0 select-none"
      style={{
        background: 'linear-gradient(135deg, #8855CC 0%, #E8607A 100%)',
        boxShadow: '0 4px 20px rgba(136,85,204,0.30)',
        fontSize: 22,
        fontWeight: 600,
        color: 'white',
        letterSpacing: '-0.01em',
      }}
    >
      {initials || <User size={24} color="white" />}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--accent-primary)', opacity: 0.7 }}>{icon}</span>
        <h2
          className="text-[11px] font-semibold tracking-[0.10em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </h2>
      </div>
      <div
        className="rounded-[16px] overflow-hidden"
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 2px 16px rgba(37,30,61,0.05)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}
    >
      <div className="min-w-0 mr-6">
        <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Kbd badge ─────────────────────────────────────────────────────────────────
function KbdBadge({ shortcut }: { shortcut: (typeof KEYBOARD_SHORTCUTS)[0] }) {
  const keys: string[] = [];
  if (shortcut.modifiers?.includes('cmd')) keys.push('⌘');
  if (shortcut.modifiers?.includes('shift')) keys.push('⇧');
  if (shortcut.modifiers?.includes('alt')) keys.push('⌥');
  if (shortcut.modifiers?.includes('ctrl')) keys.push('⌃');

  const keyLabel =
    shortcut.key === 'Escape'
      ? 'Esc'
      : shortcut.key === '`'
        ? '`'
        : shortcut.key.toUpperCase();
  keys.push(keyLabel);

  return (
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center px-2 py-0.5 rounded-[6px] text-[11px] font-mono leading-none"
          style={{
            background: 'var(--bg-surface-2)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 1px 2px rgba(37,30,61,0.08), inset 0 -1px 0 var(--border-default)',
            minWidth: 24,
          }}
        >
          {k}
        </kbd>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (session) setDisplayName(session.name);
    setIsLoaded(true);
  }, [session]);

  const handleSaveName = async () => {
    if (!session || !displayName.trim()) return;
    await updateDisplayName(session.userId, displayName.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const stagger = (i: number) => ({ duration: 0.3, delay: 0.06 + i * 0.06 });

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 50% 35% at 60% 5%, rgba(123,110,196,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[600px] mx-auto px-8 py-10 w-full flex flex-col gap-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 8 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors flex-shrink-0"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <p
              className="text-[11px] font-medium tracking-[0.10em] uppercase"
              style={{ color: 'var(--accent-primary)', opacity: 0.7 }}
            >
              Account
            </p>
            <h1
              className="font-[family-name:var(--font-fraunces)] leading-none"
              style={{ fontSize: 28, color: 'var(--text-primary)' }}
            >
              Settings.
            </h1>
          </div>
        </motion.div>

        {/* ── Profile card ────────────────────────────────────────────────── */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
            transition={stagger(0)}
          >
            <div
              className="flex items-center gap-5 px-6 py-5 rounded-[20px]"
              style={{
                background: 'var(--bg-surface-1)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 4px 24px rgba(123,110,196,0.08), 0 1px 4px rgba(37,30,61,0.05)',
              }}
            >
              <Avatar name={session.name} />
              <div className="min-w-0">
                <p
                  className="font-[family-name:var(--font-fraunces)] leading-tight truncate"
                  style={{ fontSize: 22, color: 'var(--text-primary)' }}
                >
                  {session.name}
                </p>
                <p
                  className="text-[13px] mt-0.5 truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {session.email}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Account section ─────────────────────────────────────────────── */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
            transition={stagger(1)}
          >
            <Section title="Account" icon={<User size={12} />}>
              <Row label="Display name" description="Shown in the app header.">
                <div className="flex items-center gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameSaved(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="h-9 px-3 rounded-[8px] text-[13px] outline-none w-36"
                    style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-primary)',
                      transition: 'border-color 150ms ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-default)';
                    }}
                    autoComplete="name"
                  />
                  <button
                    onClick={handleSaveName}
                    className="h-9 px-3 rounded-[8px] text-[12px] font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: nameSaved ? 'rgba(123,110,196,0.10)' : 'var(--bg-surface-2)',
                      color: nameSaved ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${nameSaved ? 'rgba(123,110,196,0.35)' : 'var(--border-default)'}`,
                    }}
                  >
                    {nameSaved && <Check size={11} />}
                    {nameSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </Row>
              <Row label="Sign out" description="Sign out of your account." last>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-[8px] text-[13px] font-medium"
                  style={{
                    background: 'rgba(208,56,88,0.07)',
                    color: 'var(--color-state-weak)',
                    border: '1px solid rgba(208,56,88,0.20)',
                    transition: 'opacity 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(208,56,88,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(208,56,88,0.07)';
                  }}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </Row>
            </Section>
          </motion.div>
        )}

        {/* ── Keyboard shortcuts ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
          transition={stagger(2)}
        >
          <Section title="Keyboard Shortcuts" icon={<Keyboard size={12} />}>
            <div className="px-5 py-1">
              {KEYBOARD_SHORTCUTS.map((s, i) => (
                <div
                  key={s.action}
                  className="flex items-center justify-between py-3.5"
                  style={{
                    borderBottom:
                      i < KEYBOARD_SHORTCUTS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <span
                    className="text-[13px] leading-snug"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {s.description}
                  </span>
                  <KbdBadge shortcut={s} />
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* ── Data ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
          transition={stagger(3)}
        >
          <Section title="Data" icon={<Database size={12} />}>
            <Row label="Storage" description="Graphs are stored locally in your browser." last>
              <button
                onClick={() => router.push('/home')}
                className="h-9 px-4 rounded-[8px] text-[13px] font-medium"
                style={{
                  background: 'var(--bg-surface-2)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  transition: 'border-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    'var(--accent-primary)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    'var(--border-default)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }}
              >
                View all graphs
              </button>
            </Row>
          </Section>
        </motion.div>

        {/* ── Legal ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 10 }}
          transition={stagger(4)}
          className="flex items-center justify-center gap-6 pb-4"
        >
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ].map(({ label, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="text-[12px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              {label}
            </button>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
