'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Moon, Sun, Check, LogOut, ArrowLeft } from 'lucide-react';
import { useThemeStore, type ThemeMode, type ColorPreset } from '@/store/theme.store';
import { getSession, signOut, updateDisplayName } from '@/lib/auth';
import { KEYBOARD_SHORTCUTS } from '@/types/ui';
import type { Session } from '@/lib/auth';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="rounded-[12px] overflow-hidden" style={{ background: 'var(--bg-surface-1)', border: '1px solid var(--border-default)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, description, children, last }: { label: string; description?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <div>
        <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {description && <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      <div className="ml-6 flex-shrink-0">{children}</div>
    </div>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={14} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
  { value: 'system', label: 'System', icon: <Monitor size={14} /> },
];

const PRESET_OPTIONS: { value: ColorPreset; label: string; accent: string; bg: string }[] = [
  { value: 'midnight-rose',  label: 'Midnight Rose',  accent: '#D4708A', bg: '#18151E' },
  { value: 'forest-night',   label: 'Forest Night',   accent: '#68C080', bg: '#141C16' },
  { value: 'ocean-deep',     label: 'Ocean Deep',     accent: '#58B8E0', bg: '#111C28' },
  { value: 'golden-hour',    label: 'Golden Hour',    accent: '#D4906A', bg: '#1C1917' },
  { value: 'lavender-dusk',  label: 'Lavender Dusk',  accent: '#A880D0', bg: '#18162A' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const { theme, colorPreset, setTheme, setColorPreset } = useThemeStore();

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (s) setDisplayName(s.name);
  }, []);

  const handleSaveName = () => {
    if (!session || !displayName.trim()) return;
    updateDisplayName(session.userId, displayName.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleLogout = () => { signOut(); router.push('/login'); };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-[600px] mx-auto px-8 py-10 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-1)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Mode</p>
            <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>Choose light, dark, or follow your system.</p>
            <div className="flex gap-1.5">
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                    style={{
                      background: active ? 'var(--accent-primary)' : 'var(--bg-surface-2)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      border: active ? '1px solid transparent' : '1px solid var(--border-default)',
                    }}
                  >
                    {opt.icon}{opt.label}{active && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Color Theme</p>
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>Pick an accent palette for dark mode.</p>
            <div className="flex gap-3 flex-wrap">
              {PRESET_OPTIONS.map((preset) => {
                const active = colorPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setColorPreset(preset.value)}
                    className="flex flex-col items-center gap-2 transition-all"
                    title={preset.label}
                  >
                    <div
                      className="w-14 h-14 rounded-[12px] flex items-end justify-end p-1.5 transition-all"
                      style={{
                        background: preset.bg,
                        border: active ? `2px solid ${preset.accent}` : '2px solid transparent',
                        boxShadow: active ? `0 0 0 1px ${preset.accent}44, 0 4px 16px ${preset.accent}20` : 'none',
                        outline: active ? `none` : `1px solid #302C3E`,
                      }}
                    >
                      <div className="w-5 h-5 rounded-full" style={{ background: preset.accent, boxShadow: `0 0 8px ${preset.accent}88` }} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', maxWidth: 56 }}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Account */}
        {session && (
          <Section title="Account">
            <Row label="Email" description="Your login email.">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{session.email}</span>
            </Row>
            <Row label="Display name" description="Shown in the app header.">
              <div className="flex items-center gap-2">
                <input
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setNameSaved(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="h-8 px-3 rounded-[6px] text-[13px] outline-none w-36"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', caretColor: 'var(--accent-primary)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; }}
                />
                <button
                  onClick={handleSaveName}
                  className="h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors"
                  style={{ background: nameSaved ? 'var(--accent-glow)' : 'var(--bg-surface-2)', color: nameSaved ? 'var(--accent-primary)' : 'var(--text-secondary)', border: `1px solid ${nameSaved ? 'var(--accent-primary)' : 'var(--border-default)'}` }}
                >
                  {nameSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </Row>
            <Row label="Sign out" description="Sign out of your account." last>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors"
                style={{ background: 'var(--color-state-weak)' + '12', color: 'var(--color-state-weak)', border: '1px solid ' + 'var(--color-state-weak)' + '33' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                <LogOut size={12} />Sign out
              </button>
            </Row>
          </Section>
        )}

        {/* Keyboard Shortcuts */}
        <Section title="Keyboard Shortcuts">
          <div className="px-5 py-3">
            {KEYBOARD_SHORTCUTS.map((s, i) => (
              <div
                key={s.action}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < KEYBOARD_SHORTCUTS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{s.description}</span>
                <kbd
                  className="px-2 py-0.5 rounded-[5px] text-[11px] font-mono"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  {s.modifiers?.includes('cmd') ? '⌘' : ''}{s.key.toUpperCase()}
                </kbd>
              </div>
            ))}
          </div>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row label="Your graphs" description="All graphs are stored locally in your browser." last>
            <button
              onClick={() => router.push('/home')}
              className="h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              View all graphs
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}
