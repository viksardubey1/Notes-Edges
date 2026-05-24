/**
 * Card — Notes & Edges Design System
 *
 * Surface 1 background, subtle border, 12px radius, 24px padding.
 * Hover: 4px lift shadow.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[12px] p-6',
        hoverable && [
          'transition-all duration-[200ms] ease-out cursor-pointer',
          'hover:shadow-[0_4px_24px_rgba(26,22,40,0.12)]',
        ],
        className,
      )}
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-default)',
        ...style,
      }}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, style, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-[17px] font-medium leading-snug', className)}
      style={{ color: 'var(--text-primary)', ...style }}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, style, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[13px] leading-relaxed', className)}
    style={{ color: 'var(--text-secondary)', ...style }}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-[15px]', className)}
      style={{ color: 'var(--text-primary)', ...style }}
      {...props}
    />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between mt-4 pt-4 border-t', className)}
      style={{ borderColor: 'var(--border-subtle)' }}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
