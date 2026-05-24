/**
 * ContextSidebar — Notes & Edges
 *
 * Left sidebar. Light, clean, warm. Collapses to icon rail.
 * Navigation uses CSS variables for full theme compliance.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Map, Upload, Search, Settings, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIStore } from '@/store/ui.store';
import { semantic } from '@/lib/tokens';
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
  const { sidebarOpen, sidebarWidth, openUploadSheet, openSearchPalette } = useUIStore();
  const router = useRouter();

  const navItems: SidebarNavItem[] = [
    {
      id: 'graphs',
      icon: <Map size={18} />,
      label: 'Knowledge Library',
      action: () => router.push('/home'),
    },
    {
      id: 'upload',
      icon: <Upload size={18} />,
      label: 'Add Ideas',
      action: openUploadSheet,
    },
    {
      id: 'search',
      icon: <Search size={18} />,
      label: 'Search',
      action: openSearchPalette,
    },
    {
      id: 'settings',
      icon: <Settings size={18} />,
      label: 'Settings',
      action: () => router.push('/settings'),
    },
  ];

  return (
    <motion.aside
      className={cn('flex flex-col h-full border-r overflow-hidden')}
      style={{
        background: 'rgba(14, 10, 30, 0.90)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      animate={{ width: sidebarWidth }}
      transition={{
        duration: 0.25,
        type: 'spring',
        stiffness: 320,
        damping: 32,
      }}
      aria-label="Sidebar"
    >
      {/* Brand mark (when expanded) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 pt-4 pb-2 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-warm) 100%)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="3" cy="6" r="1.8" fill="white" opacity="0.95" />
                  <circle cx="9" cy="3" r="1.4" fill="white" opacity="0.80" />
                  <circle cx="9" cy="9" r="1.4" fill="white" opacity="0.80" />
                  <line x1="4.7" y1="5.4" x2="7.7" y2="3.5" stroke="white" strokeWidth="0.9" opacity="0.65" />
                  <line x1="4.7" y1="6.6" x2="7.7" y2="8.5" stroke="white" strokeWidth="0.9" opacity="0.65" />
                </svg>
              </div>
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Notes & Edges
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon Rail */}
      <div className={cn('flex flex-col gap-0.5 p-2 flex-shrink-0', sidebarOpen ? 'mt-2' : 'mt-4')}>
        {navItems.map((item) => (
          <Tooltip key={item.id} delayDuration={sidebarOpen ? 999999 : 400}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={item.action}
                aria-label={item.label}
                className={cn(
                  'w-full justify-start gap-3 transition-all duration-[150ms] rounded-[10px]',
                  sidebarOpen ? 'px-3 h-9' : 'px-2.5 h-9',
                )}
                style={{
                  color: 'var(--text-muted)',
                } as React.CSSProperties}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-[13px] font-medium overflow-hidden whitespace-nowrap"
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

      {/* Divider */}
      <div className="mx-3 my-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

      {/* Expanded Content */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Universe Button */}
      <div
        className="p-2 flex-shrink-0 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Tooltip delayDuration={sidebarOpen ? 999999 : 400}>
          <TooltipTrigger asChild>
            <button
              aria-label="New universe"
              onClick={() => router.push('/welcome?step=2')}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-[10px] text-[13px] font-semibold transition-all text-white',
                sidebarOpen ? 'px-4 py-2.5 justify-start' : 'p-2.5 justify-center',
              )}
              style={{ background: 'var(--accent-primary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <Plus size={15} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    New Universe
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          {!sidebarOpen && (
            <TooltipContent side="right">New Universe</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Version tag */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 px-4 py-2"
          >
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Notes &amp; Edges · v0.1
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
