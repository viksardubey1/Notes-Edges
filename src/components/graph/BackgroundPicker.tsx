'use client';

/**
 * BackgroundPicker — Notes & Edges
 *
 * Modal triggered from the Background button in GraphControls.
 * Lets users choose from built-in subject backgrounds, solid colors,
 * or their own uploaded images.
 *
 * Live-previews on thumbnail click. Reverts on Cancel; persists on Apply.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Upload, Check, Trash2, ImagePlus } from 'lucide-react';
import { useGraphStore } from '@/store/graph.store';
import {
  BUILT_IN_BACKGROUNDS,
  SOLID_COLORS,
  BACKGROUND_CATEGORIES,
  loadUserUploads,
  saveUserUpload,
  deleteUserUpload,
  compressImage,
  generateThumbnail,
  type BackgroundCategory,
  type UserUpload,
} from '@/lib/backgrounds';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BackgroundPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSolidColor(url: string | null): boolean {
  return !!url && url.startsWith('#');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackgroundPicker({ isOpen, onClose }: BackgroundPickerProps) {
  const { backdropUrl, setBackdrop } = useGraphStore();

  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<BackgroundCategory>('All');
  const [selected, setSelected]       = useState<string | null>(backdropUrl);
  const [userUploads, setUserUploads] = useState<UserUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const originalUrlRef = useRef<string | null>(backdropUrl);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Capture original backdrop when picker opens
  useEffect(() => {
    if (isOpen) {
      originalUrlRef.current = backdropUrl;
      setSelected(backdropUrl);
      setSearch('');
      setCategory('All');
      setUploadError(null);
      setUserUploads(loadUserUploads());
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key closes (and reverts)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSelect = useCallback((url: string) => {
    setSelected(url);
    setBackdrop(url); // live preview on canvas
  }, [setBackdrop]);

  const handleRemove = useCallback(() => {
    setSelected(null);
    setBackdrop(null);
  }, [setBackdrop]);

  const handleCancel = useCallback(() => {
    setBackdrop(originalUrlRef.current); // revert to original
    onClose();
  }, [setBackdrop, onClose]);

  const handleApply = useCallback(() => {
    onClose(); // backdrop already set via live preview
  }, [onClose]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Only JPG, PNG, and WEBP files are supported.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImage(file);
      const thumbnail  = await generateThumbnail(compressed);
      const upload: UserUpload = {
        id:          `upload-${Date.now()}`,
        name:        file.name.replace(/\.[^/.]+$/, ''),
        url:         compressed,
        thumbnailUrl: thumbnail,
        uploadedAt:  new Date().toISOString(),
      };
      const updated = saveUserUpload(upload);
      setUserUploads(updated);
      handleSelect(compressed);
      setCategory('My Uploads');
    } catch {
      setUploadError('Upload failed — please try a smaller image.');
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }, [handleSelect]);

  const handleDeleteUpload = useCallback((id: string, currentUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserUpload(id);
    setUserUploads(updated);
    if (selected === currentUrl) {
      setSelected(null);
      setBackdrop(null);
    }
  }, [selected, setBackdrop]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  const visibleBuiltIns = BUILT_IN_BACKGROUNDS.filter((bg) => {
    if (category === 'Solid Colors' || category === 'My Uploads') return false;
    if (category !== 'All' && bg.category !== category) return false;
    if (q && !bg.name.toLowerCase().includes(q) && !bg.category.toLowerCase().includes(q)) return false;
    return true;
  });

  const visibleSolids = SOLID_COLORS.filter((s) => {
    if (category !== 'All' && category !== 'Solid Colors') return false;
    if (q && !s.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const visibleUploads = userUploads.filter((u) => {
    if (category !== 'All' && category !== 'My Uploads') return false;
    if (q && !u.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const showUploadsSection = category === 'All' || category === 'My Uploads';
  const showSolidsSection  = visibleSolids.length > 0;
  const showBuiltInSection = visibleBuiltIns.length > 0;
  const hasNothing = !showBuiltInSection && !showSolidsSection && (!showUploadsSection || (visibleUploads.length === 0));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bg-picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[3px]"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="bg-picker-modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-[210] flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className="pointer-events-auto flex flex-col w-full max-w-[760px] max-h-[88vh] rounded-[20px] overflow-hidden"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
                style={{ borderBottom: '1px solid #F0EDF9' }}>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#1A1430]">Choose Background</h2>
                  <p className="text-[13px] text-[#8878AA] mt-0.5">
                    Preview is live — click any background to see it instantly
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] text-[#8878AA] hover:text-[#3D2E7C] hover:bg-[#F0EDF9] transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Search ─────────────────────────────────────────────────── */}
              <div className="px-6 pt-4 pb-3 flex-shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A8C8] pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search backgrounds…"
                    className="w-full pl-8 pr-4 py-2.5 rounded-[10px] text-[13px] outline-none transition-shadow"
                    style={{
                      background: '#F7F5FD',
                      border: '1px solid #E8E2F4',
                      color: '#1A1430',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(123,110,196,0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(123,110,196,0.10)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E8E2F4';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A8C8] hover:text-[#3D2E7C]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Category filters ───────────────────────────────────────── */}
              <div className="px-6 pb-3 flex-shrink-0 overflow-x-auto">
                <div className="flex gap-1.5 w-max">
                  {BACKGROUND_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all"
                      style={{
                        background: category === cat ? 'rgba(123,110,196,1)' : '#F7F5FD',
                        color:      category === cat ? '#FFFFFF' : '#7B6EC4',
                        border:     category === cat ? 'none' : '1px solid #E8E2F4',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Scrollable grid ────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">

                {/* Empty state */}
                {hasNothing && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-[14px] bg-[#F0EDF9] flex items-center justify-center mb-3">
                      <Search size={20} className="text-[#B0A8C8]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#3D2E7C]">No backgrounds found</p>
                    <p className="text-[12px] text-[#8878AA] mt-1">Try a different search or category</p>
                  </div>
                )}

                {/* ── Built-in images ───────────────────────────────────────── */}
                {showBuiltInSection && (
                  <div className="mb-6">
                    {(category === 'All') && (
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8C8] mb-3">
                        Subject Backgrounds
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      {visibleBuiltIns.map((bg) => {
                        const isActive = selected === bg.url;
                        return (
                          <button
                            key={bg.id}
                            onClick={() => handleSelect(bg.url)}
                            className="group relative rounded-[12px] overflow-hidden text-left transition-all"
                            style={{
                              outline: isActive ? '2.5px solid #7B6EC4' : '2px solid transparent',
                              outlineOffset: '2px',
                              boxShadow: isActive
                                ? '0 0 0 4px rgba(123,110,196,0.15)'
                                : '0 2px 8px rgba(0,0,0,0.08)',
                            }}
                          >
                            <div className="aspect-[16/10] bg-[#F0EDF9]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={bg.url}
                                alt={bg.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-2.5 py-2" style={{ background: '#FAFAFA' }}>
                              <p className="text-[12px] font-medium text-[#1A1430] truncate">{bg.name}</p>
                              <p className="text-[10px] text-[#B0A8C8] mt-0.5">{bg.category}</p>
                            </div>
                            {isActive && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7B6EC4] flex items-center justify-center shadow-sm">
                                <Check size={10} strokeWidth={3} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Solid colors ──────────────────────────────────────────── */}
                {showSolidsSection && (
                  <div className="mb-6">
                    {(category === 'All' || category === 'Solid Colors') && (
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8C8] mb-3">
                        Solid Colors
                      </p>
                    )}

                    {/* Light group */}
                    {visibleSolids.filter(s => s.theme === 'light').length > 0 && (
                      <>
                        <p className="text-[10px] text-[#C0B8D8] mb-2 mt-0">Light</p>
                        <div className="grid grid-cols-4 gap-2.5 mb-4">
                          {visibleSolids.filter(s => s.theme === 'light').map((s) => {
                            const isActive = selected === s.color;
                            return (
                              <button
                                key={s.id}
                                onClick={() => handleSelect(s.color)}
                                className="group rounded-[10px] overflow-hidden text-left transition-all"
                                style={{
                                  outline: isActive ? '2.5px solid #7B6EC4' : '2px solid transparent',
                                  outlineOffset: '2px',
                                  boxShadow: isActive
                                    ? '0 0 0 4px rgba(123,110,196,0.15)'
                                    : '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              >
                                <div
                                  className="h-14 w-full"
                                  style={{ background: s.color, border: '1px solid rgba(0,0,0,0.06)' }}
                                />
                                <div className="px-2 py-1.5" style={{ background: '#FAFAFA' }}>
                                  <p className="text-[11px] font-medium text-[#1A1430] truncate">{s.name}</p>
                                </div>
                                {isActive && (
                                  <div
                                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ background: '#7B6EC4' }}
                                  >
                                    <Check size={8} strokeWidth={3} className="text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Dark group */}
                    {visibleSolids.filter(s => s.theme === 'dark').length > 0 && (
                      <>
                        <p className="text-[10px] text-[#C0B8D8] mb-2">Dark</p>
                        <div className="grid grid-cols-4 gap-2.5">
                          {visibleSolids.filter(s => s.theme === 'dark').map((s) => {
                            const isActive = selected === s.color;
                            return (
                              <button
                                key={s.id}
                                onClick={() => handleSelect(s.color)}
                                className="group relative rounded-[10px] overflow-hidden text-left transition-all"
                                style={{
                                  outline: isActive ? '2.5px solid #7B6EC4' : '2px solid transparent',
                                  outlineOffset: '2px',
                                  boxShadow: isActive
                                    ? '0 0 0 4px rgba(123,110,196,0.15)'
                                    : '0 1px 4px rgba(0,0,0,0.12)',
                                }}
                              >
                                <div
                                  className="h-14 w-full"
                                  style={{ background: s.color }}
                                />
                                <div className="px-2 py-1.5" style={{ background: '#FAFAFA' }}>
                                  <p className="text-[11px] font-medium text-[#1A1430] truncate">{s.name}</p>
                                </div>
                                {isActive && (
                                  <div
                                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ background: '#7B6EC4' }}
                                  >
                                    <Check size={8} strokeWidth={3} className="text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── My Uploads ────────────────────────────────────────────── */}
                {showUploadsSection && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B0A8C8]">
                        My Uploads
                      </p>
                      {uploadError && (
                        <p className="text-[11px] text-red-400">{uploadError}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Upload card */}
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        disabled={isUploading}
                        className="relative rounded-[12px] overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 aspect-[16/10]"
                        style={{
                          borderColor: '#D8D0F0',
                          background: isUploading ? 'rgba(123,110,196,0.06)' : '#FAFAFA',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#7B6EC4'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,110,196,0.05)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D8D0F0'; (e.currentTarget as HTMLButtonElement).style.background = isUploading ? 'rgba(123,110,196,0.06)' : '#FAFAFA'; }}
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 rounded-full border-2 border-[#7B6EC4] border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-[8px] bg-[#F0EDF9] flex items-center justify-center">
                              <ImagePlus size={16} className="text-[#7B6EC4]" />
                            </div>
                            <span className="text-[11px] font-medium text-[#7B6EC4]">Upload image</span>
                            <span className="text-[10px] text-[#B0A8C8]">JPG · PNG · WEBP</span>
                          </>
                        )}
                      </button>

                      {/* User upload thumbnails */}
                      {visibleUploads.map((upload) => {
                        const isActive = selected === upload.url;
                        return (
                          <button
                            key={upload.id}
                            onClick={() => handleSelect(upload.url)}
                            className="group relative rounded-[12px] overflow-hidden text-left transition-all"
                            style={{
                              outline: isActive ? '2.5px solid #7B6EC4' : '2px solid transparent',
                              outlineOffset: '2px',
                              boxShadow: isActive
                                ? '0 0 0 4px rgba(123,110,196,0.15)'
                                : '0 2px 8px rgba(0,0,0,0.08)',
                            }}
                          >
                            <div className="aspect-[16/10] bg-[#F0EDF9]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={upload.thumbnailUrl}
                                alt={upload.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="px-2.5 py-2" style={{ background: '#FAFAFA' }}>
                              <p className="text-[12px] font-medium text-[#1A1430] truncate">{upload.name}</p>
                            </div>
                            {/* Delete button */}
                            <div
                              className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteUpload(upload.id, upload.url, e)}
                            >
                              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                                <Trash2 size={9} className="text-red-400" />
                              </div>
                            </div>
                            {isActive && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#7B6EC4] flex items-center justify-center shadow-sm">
                                <Check size={10} strokeWidth={3} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* ── Footer ─────────────────────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ borderTop: '1px solid #F0EDF9' }}
              >
                <button
                  onClick={handleRemove}
                  className="text-[13px] text-[#B0A8C8] hover:text-[#7B6EC4] transition-colors"
                  disabled={!selected}
                  style={{ opacity: selected ? 1 : 0.4 }}
                >
                  Remove background
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-[#7B6EC4] transition-colors hover:bg-[#F0EDF9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-5 py-2 rounded-[9px] text-[13px] font-medium text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #7B6EC4 0%, #6A9FD8 100%)',
                      boxShadow: '0 2px 8px rgba(123,110,196,0.35)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(123,110,196,0.50)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(123,110,196,0.35)'; }}
                  >
                    Apply Background
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hidden file input */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
            aria-hidden="true"
          />
        </>
      )}
    </AnimatePresence>
  );
}
