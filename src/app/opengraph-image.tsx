import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2D2640 0%, #1E1A2E 60%, #2A1A24 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(123,110,196,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Graph dot cluster — decorative */}
        {[
          { x: 160, y: 180, r: 10, opacity: 0.6 },
          { x: 260, y: 120, r: 7,  opacity: 0.4 },
          { x: 320, y: 220, r: 8,  opacity: 0.5 },
          { x: 940, y: 160, r: 9,  opacity: 0.5 },
          { x: 1020, y: 260, r: 6, opacity: 0.35 },
          { x: 880, y: 280, r: 7,  opacity: 0.4 },
          { x: 160, y: 460, r: 8,  opacity: 0.4 },
          { x: 260, y: 520, r: 6,  opacity: 0.3 },
          { x: 1040, y: 460, r: 9, opacity: 0.45 },
        ].map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: dot.x,
              top: dot.y,
              width: dot.r * 2,
              height: dot.r * 2,
              borderRadius: '50%',
              background: '#9585DC',
              opacity: dot.opacity,
            }}
          />
        ))}

        {/* Connecting lines */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px' }}
          viewBox="0 0 1200 630"
        >
          <line x1="170" y1="185" x2="267" y2="127" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="267" y1="127" x2="328" y2="228" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="170" y1="185" x2="328" y2="228" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="949" y1="169" x2="1027" y2="266" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="949" y1="169" x2="887" y2="287" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="1027" y1="266" x2="887" y2="287" stroke="#7B6EC4" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="168" y1="468" x2="266" y2="523" stroke="#B85A6E" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="1049" y1="469" x2="887" y2="287" stroke="#9585DC" strokeWidth="1" strokeOpacity="0.15" />
          <line x1="328" y1="228" x2="600" y2="315" stroke="#7B6EC4" strokeWidth="1" strokeOpacity="0.12" />
          <line x1="887" y1="287" x2="600" y2="315" stroke="#7B6EC4" strokeWidth="1" strokeOpacity="0.12" />
        </svg>

        {/* Logo icon */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #7B6EC4 0%, #B85A6E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 8px 32px rgba(123,110,196,0.4)',
          }}
        >
          {/* Share/graph icon */}
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="10" cy="22" r="5" fill="rgba(255,255,255,0.9)" />
            <circle cx="34" cy="10" r="5" fill="rgba(255,255,255,0.9)" />
            <circle cx="34" cy="34" r="5" fill="rgba(255,255,255,0.9)" />
            <line x1="14.5" y1="19.5" x2="29.5" y2="12.5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
            <line x1="14.5" y1="24.5" x2="29.5" y2="31.5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '700',
            color: '#F5F3FB',
            letterSpacing: '-1.5px',
            lineHeight: 1,
            marginBottom: '16px',
          }}
        >
          Notes &amp; Edges
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: '#9585DC',
            fontWeight: '400',
            letterSpacing: '0.5px',
          }}
        >
          Think in graphs.
        </div>
      </div>
    ),
    { ...size },
  );
}
