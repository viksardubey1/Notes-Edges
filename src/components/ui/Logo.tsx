'use client';

/**
 * Shared logo primitives — used everywhere the brand mark appears.
 *
 * <LogoMark size={28} /> — gradient rounded square with the 3-node icon
 * <Logo size={28} />     — mark + "Notes & Edges" wordmark beside it
 */

interface LogoMarkProps {
  /** Side length of the rounded square in px. Default 28. */
  size?: number;
  /** Corner radius. Default auto-scales with size. */
  radius?: number;
}

export function LogoMark({ size = 28, radius }: LogoMarkProps) {
  const r = radius ?? Math.round(size * 0.29);
  const iconSize = Math.round(size * 0.5);
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: 'linear-gradient(135deg, #8855CC 0%, #E8607A 100%)',
      }}
      aria-hidden="true"
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none">
        {/* edges first so nodes render on top */}
        <line x1="4.7" y1="5.4" x2="7.7" y2="3.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
        <line x1="4.7" y1="6.6" x2="7.7" y2="8.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
        {/* left node */}
        <circle cx="3" cy="6" r="1.8" fill="white" opacity="0.95" />
        {/* top-right node */}
        <circle cx="9" cy="3" r="1.4" fill="white" opacity="0.85" />
        {/* bottom-right node */}
        <circle cx="9" cy="9" r="1.4" fill="white" opacity="0.85" />
      </svg>
    </div>
  );
}

interface LogoProps extends LogoMarkProps {
  /** Font size of the wordmark in px. Default auto-scales. */
  fontSize?: number;
  /** Color of the wordmark text. */
  textColor?: string;
  /** Gap between mark and wordmark in px. Default 8. */
  gap?: number;
}

export function Logo({
  size = 28,
  radius,
  fontSize,
  textColor = '#251E3D',
  gap = 8,
}: LogoProps) {
  const fs = fontSize ?? Math.round(size * 0.5);
  return (
    <span className="flex items-center" style={{ gap }}>
      <LogoMark size={size} radius={radius} />
      <span
        className="font-semibold tracking-tight leading-none"
        style={{ fontSize: fs, color: textColor }}
      >
        Notes &amp; Edges
      </span>
    </span>
  );
}
