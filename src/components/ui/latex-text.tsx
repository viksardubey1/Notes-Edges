'use client';

/**
 * LatexText — renders a string that may contain LaTeX math.
 *
 * Supported syntax:
 *   $$...$$ or \[...\]  →  display (block) math
 *   $...$  or \(...\)   →  inline math
 *
 * Everything else is rendered as plain text.
 */

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'display'; value: string };

function parse(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ , \[...\] , $...$ , \(...\) — in priority order
  const re = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }

    const raw = match[0];
    if (raw.startsWith('$$') || raw.startsWith('\\[')) {
      const inner = raw.startsWith('$$')
        ? raw.slice(2, -2)
        : raw.slice(2, -2); // \[...\] also 2 chars each side
      segments.push({ type: 'display', value: inner.trim() });
    } else {
      const inner = raw.startsWith('$')
        ? raw.slice(1, -1)
        : raw.slice(2, -2); // \(...\)
      segments.push({ type: 'inline', value: inner.trim() });
    }
    last = match.index + raw.length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }

  return segments;
}

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: false,
    });
  } catch {
    return latex;
  }
}

export function LatexText({ children, className, style }: LatexTextProps) {
  const segments = useMemo(() => parse(children ?? ''), [children]);

  const hasDisplay = segments.some((s) => s.type === 'display');

  if (hasDisplay) {
    // Wrap in a block element when there's display math
    return (
      <span className={className} style={style}>
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
          const html = renderKatex(seg.value, seg.type === 'display');
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
              style={seg.type === 'display' ? { display: 'block', overflowX: 'auto', padding: '4px 0' } : undefined}
            />
          );
        })}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <React.Fragment key={i}>{seg.value}</React.Fragment>;
        const html = renderKatex(seg.value, false);
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}
