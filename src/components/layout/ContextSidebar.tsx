/**
 * ContextSidebar — Notes & Edges
 *
 * Minimal left rail. Navigation + lightweight graph context.
 * Collapses to icon strip.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Map, Search, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

interface SidebarNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  action?: () => void;
}

interface ContextSidebarProps {
  children?: React.ReactNode;
}

export function ContextSidebar({ children }: ContextSidebarProps) {
  const { sidebarOpen, sidebarWidth, openSearchPalette } = useUIStore();
  const router = useRouter();

  const navItems: SidebarNavItem[] = [
    {
      id: 'graphs',
      icon: <Map size={16} />,
      label: 'Library',
      action: () => router.push('/home'),
    },
    {
      id: 'search',
      icon: <Search size={16} />,
      label: 'Search',
      action: openSearchPalette,
    },
    {
      id: 'settings',
      icon: <Settings size={16} />,
      label: 'Settings',
      action: () => router.push('/settings'),
    },
  ];

  return (
    <motion.aside
      className={cn('flex flex-col h-full border-r overflow-hidden')}
      style={{
        background: 'rgba(255,255,255,0.88)',
        borderColor: 'rgba(123,110,196,0.10)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.22, type: 'spring', stiffness: 340, damping: 34 }}
      aria-label="Sidebar"
    >
      {/* Nav items */}
      <div className={cn('flex flex-col gap-0.5 p-1.5 pt-3 flex-shrink-0')}>
        {navItems.map((item) => (
          <Tooltip key={item.id} delayDuration={sidebarOpen ? 999999 : 300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={item.action}
                aria-label={item.label}
                className={cn(
                  'w-full justify-start gap-2.5 transition-all duration-[120ms] rounded-[8px]',
                  sidebarOpen ? 'px-2.5 h-8' : 'px-0 h-8 justify-center',
                )}
                style={{ color: 'var(--text-muted)' } as React.CSSProperties}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.12 }}
                      className="text-[12px] font-medium overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">{item.label}</TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>

      {/* Soft divider */}
      {sidebarOpen && (
        <div className="mx-3 my-1" style={{ height: 1, background: 'var(--border-subtle)' }} />
      )}

      {/* Expanded content (graph context, project list) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
