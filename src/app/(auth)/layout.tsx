/**
 * Auth Layout — Notes & Edges
 * Used by: /login, /signup
 * Minimal, centered, no sidebar or command bar.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center min-h-screen w-full"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <span className="text-[17px] font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Notes &amp; Edges
          </span>
          <p className="text-[11px] mt-1 tracking-[0.06em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Think in graphs.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
