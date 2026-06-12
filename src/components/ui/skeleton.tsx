/**
 * Skeleton — Notes & Edges Design System
 *
 * Shimmer loading states. Never spinners.
 * Light-mode friendly, soft lavender/gray.
 * Respects prefers-reduced-motion.
 */

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[8px] bg-[#EEEAF8]',
        'relative overflow-hidden',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-[#F7F5FC] before:to-transparent',
        'before:animate-[shimmer_2.4s_ease-in-out_infinite]',
        'motion-reduce:before:animate-none',
        className,
      )}
      {...props}
    />
  );
}

/** Round skeleton for node/dot placeholders. */
function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('rounded-full', className)} {...props} />;
}

export { Skeleton, SkeletonCircle };
