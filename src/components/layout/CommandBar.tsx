/**
 * CommandBar — Notes & Edges
 *
 * Top bar: light, airy, warm. Graph name editing, search, upload, user menu.
 * Uses CSS variables throughout for full theme compliance.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { PanelLeft, LogOut, Check, Plus, RotateCcw, AlertTriangle, Upload, ChevronDown, Copy, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIStore } from '@/store/ui.store';
import { useGraphStore } from '@/store/graph.store';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';
import { renameGraph, cloneGraph } from '@/lib/graphs';
import dynamic from 'next/dynamic';

const AddNodeDialog = dynamic(
  () => import('@/components/graph/AddNodeDialog').then((m) => m.AddNodeDialog),
  { ssr: false },
);
import { cn } from '@/lib/utils';
import posthog from 'posthog-js';

interface CommandBarProps {
  projectName?: string;
  graphId?: string;
}

export function CommandBar({ projectName = 'Untitled Graph', graphId }: CommandBarProps) {
  const { toggleSidebar, sidebarOpen, openUploadSheet } = useUIStore();
  const { graph, clearGraph } = useGraphStore();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(graph?.name ?? projectName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetRef = useRef<HTMLDivElement>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const { session } = useAuth();

  const commitName = () => {
    const trimmed = nameValue.trim() || (graph?.name ?? projectName);
    setNameValue(trimmed);
    setIsEditingName(false);
    if (graph && session) {
      void renameGraph(session.userId, graph.id, trimmed);
      posthog.capture('graph_renamed', { graph_id: graph.id, new_name: trimmed });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setNameValue(graph?.name ?? projectName); setIsEditingName(false); }
  };

  const handleLogout = () => { void signOut().then(() => router.push('/login')); };
  const handleReset = () => { clearGraph(); setShowResetConfirm(false); };

  const isOwnGraph = !graph || !session || graph.userId === session.userId;

  const handleShare = () => {
    if (!graph) return;
    const url = `${window.location.origin}/graph/${graph.id}`;
    void navigator.clipboard.writeText(url).then(() => {
      posthog.capture('graph_shared', { graph_id: graph.id, graph_name: graph.name });
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const handleMakeCopy = async () => {
    if (!graph || !session || isCopying) return;
    setIsCopying(true);
    try {
      const clone = await cloneGraph(session.userId, graph);
      if (clone) {
        posthog.capture('graph_copied', { source_graph_id: graph.id, new_graph_id: clone.id, graph_name: graph.name });
        router.push(`/graph/${clone.id}`);
      } else {
        console.error('[CommandBar] cloneGraph returned null');
      }
    } catch (err) {
      console.error('[CommandBar] handleMakeCopy error:', err);
      posthog.captureException(err);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <div
        className={cn('flex items-center justify-between h-full w-full px-4 border-b')}
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          borderColor: 'rgba(123, 110, 196, 0.12)',
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
              style={{ background: 'linear-gradient(135deg, #8855CC 0%, #E8607A 100%)' }}
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <line x1="4.7" y1="5.4" x2="7.7" y2="3.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
                <line x1="4.7" y1="6.6" x2="7.7" y2="8.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.70" />
                <circle cx="3" cy="6" r="1.8" fill="white" opacity="0.95" />
                <circle cx="9" cy="3" r="1.4" fill="white" opacity="0.85" />
                <circle cx="9" cy="9" r="1.4" fill="white" opacity="0.85" />
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

        {/* Center: primary action */}
        <div className="flex items-center gap-2 flex-shrink-0 mx-3">
          {isOwnGraph ? (
            <>
              <button
                onClick={openUploadSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
              >
                <Upload size={12} />
                Add notes
              </button>
              <kbd
                className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-medium select-none"
                style={{
                  background: 'var(--bg-surface-2)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-default)',
                }}
              >
                ⌘K
              </kbd>
            </>
          ) : (
            <button
              onClick={() => { void handleMakeCopy(); }}
              disabled={isCopying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all disabled:opacity-60"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
              onMouseEnter={(e) => { if (!isCopying) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bright)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary)'; }}
            >
              <Copy size={12} />
              {isCopying ? 'Copying…' : 'Make a copy'}
            </button>
          )}
        </div>

        {/* Right: Actions + user */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {graph && (
            <button
              onClick={handleShare}
              aria-label="Share graph"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
              style={{
                background: shareCopied ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                color: shareCopied ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {shareCopied ? <Check size={12} /> : <Share2 size={12} />}
              {shareCopied ? 'Link copied to clipboard' : 'Share'}
            </button>
          )}

          {graph && isOwnGraph && (
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

          {/* User menu */}
          {session && (
            <div className="relative ml-1.5" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[10px] transition-colors"
                style={{
                  background: userMenuOpen ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
                  border: '1px solid var(--border-default)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; }}
                onMouseLeave={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
                >
                  {session.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-[12px] font-medium max-w-[96px] truncate hidden sm:block"
                  style={{ color: 'var(--text-secondary)' }}>
                  {session.name.split(' ')[0]}
                </span>
                <ChevronDown size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-[220px] rounded-[14px] overflow-hidden z-50"
                    style={{
                      background: 'var(--bg-surface-1)',
                      border: '1px solid var(--border-default)',
                      boxShadow: '0 8px 32px rgba(37,30,61,0.12), 0 2px 8px rgba(37,30,61,0.06)',
                    }}
                  >
                    {/* Profile info */}
                    <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
                        >
                          {session.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {session.name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {session.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5">
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-colors text-left"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(208,56,88,0.07)';
                          (e.currentTarget as HTMLButtonElement).style.color = '#D03858';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                        }}
                      >
                        <LogOut size={13} />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AddNodeDialog open={addNodeOpen} onClose={() => setAddNodeOpen(false)} />
    </>
  );
}
