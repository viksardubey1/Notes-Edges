/**
 * Button — Notes & Edges Design System
 *
 * Only two variants per spec: primary (Arc Blue fill) and ghost (transparent).
 * No secondary, danger, outline, or warning variants.
 * Destructive actions use ghost variant + confirmation tooltip — never a modal.
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-[10px]',
    'font-medium text-[13px] leading-none tracking-[0.01em]',
    'transition-all duration-[150ms] ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent-primary] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    'min-h-[44px] min-w-[44px]',
    'select-none cursor-pointer',
    'whitespace-nowrap',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'text-white',
          '[background:var(--accent-primary)]',
          'hover:[background:var(--accent-bright)]',
          'active:scale-[0.98]',
        ].join(' '),
        ghost: [
          'bg-transparent',
          '[color:var(--text-muted)]',
          'hover:[background:var(--bg-surface-2)] hover:[color:var(--text-primary)]',
          'active:scale-[0.98]',
        ].join(' '),
      },
      size: {
        default: 'px-5 py-3',
        sm: 'px-3 py-2 text-[11px]',
        lg: 'px-6 py-3.5 text-[15px]',
        icon: 'p-2.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
