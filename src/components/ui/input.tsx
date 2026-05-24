/**
 * Input — Notes & Edges Design System
 *
 * Surface 2 background, no border at rest, Hairline on focus,
 * Arc Blue glow on active. Ghost placeholder.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[10px]',
          '[background:var(--bg-surface-2)] border [border-color:var(--border-default)]',
          'px-4 py-3',
          'text-[15px] [color:var(--text-primary)] placeholder:[color:var(--text-muted)]',
          'tracking-[0.01em]',
          'outline-none',
          'transition-all duration-[200ms] ease-out',
          'focus:[border-color:var(--accent-primary)] focus:[box-shadow:0_0_0_3px_var(--accent-glow)]',
          'disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
