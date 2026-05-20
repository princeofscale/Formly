'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, ChevronLeft, ChevronRight, Trash2, GitCompare } from 'lucide-react'
import type { ProgressPhotoWithUrl } from '@/lib/db/progress-photos'
import { deleteProgressPhotoAction } from '@/app/(app)/progress/photos/actions'

interface Props {
  photos: ProgressPhotoWithUrl[]
}

export function PhotoGallery({ photos }: Props) {
  const t = useTranslations('progress.photos')
  const locale = useLocale()
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePair, setComparePair] = useState<[number, number] | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const touchStartRef = useRef<number | null>(null)

  // Lock body scroll while viewer or compare is open
  useEffect(() => {
    const active = viewerIdx !== null || (compareMode && comparePair !== null)
    if (active) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [viewerIdx, compareMode, comparePair])

  if (photos.length === 0) {
    return (
      <div
        className="rounded-[20px] p-10 text-center"
        style={{
          background: '#15151C',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {t('empty')}
        </p>
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  function openViewer(idx: number) {
    if (compareMode) {
      // Pick two for compare
      if (!comparePair) setComparePair([idx, idx])
      else if (comparePair[0] === idx) return
      else setComparePair([comparePair[0], idx])
    } else {
      setViewerIdx(idx)
    }
  }

  function closeViewer() {
    setViewerIdx(null)
    setConfirmDeleteId(null)
  }

  function prev() {
    if (viewerIdx === null) return
    setViewerIdx((viewerIdx - 1 + photos.length) % photos.length)
    setConfirmDeleteId(null)
  }

  function next() {
    if (viewerIdx === null) return
    setViewerIdx((viewerIdx + 1) % photos.length)
    setConfirmDeleteId(null)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartRef.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current
    touchStartRef.current = null
    if (Math.abs(dx) < 50) return
    if (dx > 0) prev()
    else next()
  }

  function deleteAt(photoId: string) {
    startTransition(async () => {
      try {
        await deleteProgressPhotoAction(photoId)
        // After deletion, photos list will be revalidated; close viewer
        closeViewer()
      } catch {
        // ignore
      }
    })
  }

  const active = viewerIdx !== null ? photos[viewerIdx] : null

  return (
    <>
      {/* Compare toggle */}
      {photos.length >= 2 && (
        <div className="flex items-center justify-between -mt-2">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {photos.length} {t('count')}
          </p>
          <button
            type="button"
            onClick={() => {
              setCompareMode(v => !v)
              setComparePair(null)
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={{
              background: compareMode ? '#FF3B47' : 'rgba(255, 255, 255, 0.04)',
              border: compareMode ? '1px solid #FF3B47' : '1px solid rgba(255, 255, 255, 0.08)',
              color: compareMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <GitCompare className="h-3.5 w-3.5" />
            {compareMode ? t('compareCancel') : t('compare')}
          </button>
        </div>
      )}

      {compareMode && (
        <p className="text-[11px] -mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {comparePair && comparePair[0] !== comparePair[1]
            ? t('compareReady')
            : t('comparePrompt')}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((p, i) => {
          const selectedForCompare = compareMode && comparePair?.includes(i)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openViewer(i)}
              className="relative aspect-[3/4] rounded-[10px] overflow-hidden bg-white/[0.03] transition-all"
              style={{
                outline: selectedForCompare ? '2px solid #FF3B47' : 'none',
                outlineOffset: '-2px',
              }}
            >
              {p.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.signed_url} alt={p.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs">
                  {t('imageMissing')}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-1.5 text-[9px] font-mono text-white"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
              >
                {formatDate(p.taken_at)}
              </div>
              {p.weight_kg != null && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold font-mono"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#FFFFFF' }}
                >
                  {p.weight_kg}кг
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Compare view */}
      {compareMode && comparePair && comparePair[0] !== comparePair[1] && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col p-4 animate-in fade-in duration-200"
          onClick={() => setComparePair(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setComparePair(null) }}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 grid grid-cols-2 gap-2 items-center" onClick={e => e.stopPropagation()}>
            {comparePair.map((idx, i) => {
              const p = photos[idx]
              return (
                <div key={i} className="space-y-2 h-full flex flex-col">
                  {p.signed_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.signed_url} alt="" className="flex-1 min-h-0 w-full object-contain rounded-[10px]" />
                  )}
                  <div className="text-center">
                    <p className="font-mono text-[11px] text-white">{formatDate(p.taken_at)}</p>
                    {p.weight_kg != null && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#FF6E76' }}>{p.weight_kg} кг</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Single viewer */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <button type="button" onClick={closeViewer} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="font-mono text-sm font-bold">{formatDate(active.taken_at)}</p>
              {active.weight_kg != null && (
                <p className="text-[11px]" style={{ color: '#FF6E76' }}>{active.weight_kg} кг</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(active.id)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-2 relative">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {active.signed_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.signed_url} alt="" className="max-w-full max-h-full object-contain rounded-[10px]" />
            )}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={next}
                className="absolute right-2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {active.caption && (
            <p className="px-4 pb-3 text-center text-sm text-white/80">{active.caption}</p>
          )}

          {confirmDeleteId === active.id && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-black/90 backdrop-blur border-t border-white/10 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
              <p className="flex-1 text-sm text-white/80">{t('confirmDelete')}</p>
              <button
                type="button"
                onClick={() => deleteAt(active.id)}
                className="h-10 px-4 rounded-[8px] text-sm font-bold text-white"
                style={{ background: '#FF3B47' }}
              >
                {t('deleteYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="h-10 px-4 rounded-[8px] text-sm text-white/70"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {t('deleteNo')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
