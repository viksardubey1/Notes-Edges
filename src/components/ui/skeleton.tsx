/**
 * Skeleton — Notes & Edges Design System
 *
 * Shimmer loading states. Never spinners.
 * Respects prefers-reduced-motion.
 */

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[8px] bg-[#1A1A26]',
        'relative overflow-hidden',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-[#2A2A3F] before:to-transparent',
        'before:animate-[shimmer_1.5s_infinite]',
        'motion-reduce:before:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
