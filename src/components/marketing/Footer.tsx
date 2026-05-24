import Link from 'next/link';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export function Footer() {
  return (
    <footer
      className="py-8 px-8 border-t"
      style={{ borderColor: '#2A2A3F' }}
    >
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4" fill="#4D7FFF" opacity="0.9" />
            <circle cx="17" cy="17" r="4" fill="#4D7FFF" opacity="0.5" />
            <line x1="10.5" y1="10.5" x2="13.5" y2="13.5"
              stroke="#4D7FFF" strokeWidth="1.5" opacity="0.6" />
          </svg>
          <span className="text-[13px] font-medium text-[#8888AA]">Notes & Edges</span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[12px] text-[#4A4A6A] hover:text-[#8888AA] transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-[11px] text-[#4A4A6A]">
          © {new Date().getFullYear()} Notes & Edges
        </p>
      </div>
    </footer>
  );
}
