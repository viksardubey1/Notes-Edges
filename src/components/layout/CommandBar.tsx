/**
 * CommandBar — Notes & Edges
 *
 * Top bar: light, airy, warm. Graph name editing, search, upload, user menu.
 * Uses CSS variables throughout for full theme compliance.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { PanelLeft, Search, Upload, Settings, LogOut, Check, Plus, RotateCcw, AlertTriangle, Maximize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIStore } from '@/store/ui.store';
import { useGraphStore } from '@/store/graph.store';
import { getSession, signOut } from '@/lib/auth';
import { renameGraph } from '@/lib/graphs';
import { AddNodeDialog } from '@/components/graph/AddNodeDialog';
import { cn } from '@/lib/utils';

interface CommandBarProps {
  projectName?: string;
  graphId?: string;
}

export function CommandBar({ projectName = 'Untitled Graph', graphId }: CommandBarProps) {
  const { toggleSidebar, sidebarOpen, openUploadSheet, openSearchPalette } = useUIStore();
  const { graph, clearGraph, fitToContent } = useGraphStore();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(graph?.name ?? projectName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetRef = useRef<HTMLDivElement>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);

  useEffect(() => {
    setNameValue(graph?.name ?? projectName);
  }, [graph?.name, projectName]);

  useEffect(() => {
    if (!showResetConfirm) return;
    const handler = (e: MouseEvent) => {
      if (resetRef.current && !resetRef.current.contains(e.target as Node)) {
        setShowResetConfirm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showResetConfirm]);

  const session = typeof window !== 'undefined' ? getSession() : null;

  const commitName = () => {
    const trimmed = nameValue.trim() || (graph?.name ?? projectName);
    setNameValue(trimmed);
    setIsEditingName(false);
    if (graph && session) renameGraph(session.userId, graph.id, trimmed);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setNameValue(graph?.name ?? projectName); setIsEditingName(false); }
  };

  const handleLogout = () => { signOut(); router.push('/login'); };
  const handleReset = () => { clearGraph(); setShowResetConfirm(false); };

  return (
    <>
      <div
        className={cn('flex items-center justify-between h-full w-full px-4 border-b')}
        style={{
          background: 'rgba(12, 8, 26, 0.92)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Left: Logo + Sidebar toggle + Graph name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Logo */}
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-1.5 flex-shrink-0 mr-1 group"
            aria-label="Go to home"
          >
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105 group-hover:shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-warm) 100%)' }}
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <circle cx="3" cy="6" r="1.8" fill="white" opacity="0.95" />
                <circle cx="9" cy="3" r="1.4" fill="white" opacity="0.80" />
                <circle cx="9" cy="9" r="1.4" fill="white" opacity="0.80" />
                <line x1="4.7" y1="5.4" x2="7.7" y2="3.5" stroke="white" strokeWidth="0.9" opacity="0.65" />
                <line x1="4.7" y1="6.6" x2="7.7" y2="8.5" stroke="white" strokeWidth="0.9" opacity="0.65" />
              </svg>
            </div>
          </button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                className="flex-shrink-0"
                style={{ color: 'var(--text-muted)' } as React.CSSProperties}
              >
                <PanelLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle sidebar (⌘B)</TooltipContent>
          </Tooltip>

          {/* Editable graph name */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[280px]">
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={commitName}
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-[14px] font-medium outline-none border-b pb-0.5"
                style={{
                  color: 'var(--text-primary)',
                  borderColor: 'var(--accent-primary)',
                  caretColor: 'var(--accent-primary)',
                }}
                placeholder="Graph name…"
              />
              <button
                onClick={commitName}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-[4px]"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
              >
                <Check size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-[14px] font-medium truncate max-w-[240px] transition-colors text-left px-1.5 py-0.5 rounded-[6px]"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              title="Click to rename"
            >
              {nameValue}
            </button>
          )}
        </div>

        {/* Graph stats pill */}
        {graph && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 mx-3">
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'var(--bg-surface-2)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              {graph.nodeCount} concepts · {graph.edgeCount} links
            </span>
          </div>
        )}

        {/* Right: Actions + user */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                onClick={openSearchPalette}
                aria-label="Search (⌘K)"
                style={{ color: 'var(--text-muted)' } as React.CSSProperties}
              >
                <Search size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (⌘K)</TooltipContent>
          </Tooltip>

          {graph && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => fitToContent({ width: window.innerWidth, height: window.innerHeight })}
                  aria-label="Fit to view"
                  style={{ color: 'var(--text-muted)' } as React.CSSProperties}
                >
                  <Maximize2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to view</TooltipContent>
            </Tooltip>
          )}

          {graph && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setAddNodeOpen(true)}
                  aria-label="Add concept"
                  style={{ color: 'var(--text-muted)' } as React.CSSProperties}
                >
                  <Plus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add concept manually</TooltipContent>
            </Tooltip>
          )}

          {graphId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  onClick={openUploadSheet}
                  aria-label="Upload notes"
                  style={{ color: 'var(--text-muted)' } as React.CSSProperties}
                >
                  <Upload size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload notes</TooltipContent>
            </Tooltip>
          )}

          {graph && (
            <div className="relative" ref={resetRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setShowResetConfirm((v) => !v)}
                    aria-label="Reset graph"
                    style={{ color: 'var(--text-muted)' } as React.CSSProperties}
                  >
                    <RotateCcw size={15} />
                  </Button>
                </TooltipTrigger>
                {!showResetConfirm && <TooltipContent>Reset graph</TooltipContent>}
              </Tooltip>

              <AnimatePresence>
                {showResetConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[220px] rounded-[14px] p-4 z-50"
                    style={{
                      background: 'var(--bg-surface-1)',
                      border: '1px solid var(--border-default)',
                      boxShadow: 'var(--panel-shadow)',
                    }}
                  >
                    <div className="flex items-start gap-2.5 mb-3.5">
                      <AlertTriangle size={13} style={{ color: 'var(--color-state-weak)', flexShrink: 0 }} className="mt-0.5" />
                      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Clear the graph from view? This doesn&apos;t delete it from your library.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 h-8 rounded-[8px] text-[12px] font-medium transition-colors"
                        style={{
                          background: 'var(--bg-surface-2)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-default)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex-1 h-8 rounded-[8px] text-[12px] font-medium transition-colors"
                        style={{
                          background: 'rgba(208, 56, 88, 0.10)',
                          color: 'var(--color-state-weak)',
                          border: '1px solid rgba(208, 56, 88, 0.25)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(208, 56, 88, 0.16)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(208, 56, 88, 0.10)'; }}
                      >
                        Clear graph
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon"
                aria-label="Settings"
                onClick={() => router.push('/settings')}
                style={{ color: 'var(--text-muted)' } as React.CSSProperties}
              >
                <Settings size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {/* User avatar + logout */}
          {session && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="ml-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] transition-colors"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                  }}
                  aria-label="Sign out"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
                  >
                    {session.name.charAt(0).toUpperCase()}
                  </span>
                  <LogOut size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Sign out ({session.email})</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <AddNodeDialog open={addNodeOpen} onClose={() => setAddNodeOpen(false)} />
    </>
  );
}
