/**
 * Tooltip — Notes & Edges Design System
 *
 * Surface 2 background, Chalk text, 8px radius.
 * 400ms delay on appear, immediate on mouse-out.
 * Default position: above. Never below if above fits.
 */

'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      side="top"
      className={cn(
        'z-50 overflow-hidden rounded-[6px]',
        'px-2.5 py-1.5',
        'text-[11px] font-medium leading-none tracking-wide',
        className,
      )}
      style={{
        background: '#1A1626',
        color: '#C8BEDD',
        border: '1px solid #302C3E',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
