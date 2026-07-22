'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Loader2,
  MoveHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ProgressPhotoWithUrl } from '@/lib/db/progress-photos'
import {
  deleteProgressPhotoAction,
  registerProgressPhotoAction,
} from '@/app/(app)/progress/photos/actions'
import { weightUnit } from '@/lib/units'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const ACCEPT = ALLOWED_TYPES.join(',')
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

interface Props {
  photos: ProgressPhotoWithUrl[]
}

export function PhotoGallery({ photos }: Props) {
  const t = useTranslations('progress.photos')
  const locale = useLocale()
  const loc = locale === 'ru' ? 'ru-RU' : 'en-US'
  const kg = weightUnit(locale)
  const router = useRouter()

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>(
    'idle',
  )
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Viewer / compare state
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePair, setComparePair] = useState<[number, number] | null>(null)
  const [comparePos, setComparePos] = useState(50)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const touchStartRef = useRef<number | null>(null)

  const compareOpen = compareMode && comparePair !== null && comparePair[0] !== comparePair[1]

  // Lock body scroll while viewer or compare is open
  useEffect(() => {
    const active = viewerIdx !== null || compareOpen
    if (active) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [viewerIdx, compareOpen])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(loc, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (picked.type && !ALLOWED_TYPES.includes(picked.type)) {
      setUploadError(t('errorType'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (picked.size > MAX_BYTES) {
      setUploadError(t('errorTooBig'))
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))
    setUploadError(null)
  }

  function resetUpload() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setWeight('')
    setCaption('')
    setProgress('idle')
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!file) return
    setUploadError(null)
    setProgress('uploading')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      // Derive the extension from the (validated) MIME type, never from the
      // user-supplied filename — keeps the storage key to a known-safe shape.
      const ext = EXT_BY_TYPE[file.type] ?? 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const path = `${user.id}/${filename}`

      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (storageError) throw storageError

      setProgress('saving')
      const weightVal = weight ? parseFloat(weight.replace(',', '.')) : null
      startTransition(async () => {
        try {
          await registerProgressPhotoAction({
            storagePath: path,
            takenAt: new Date().toISOString(),
            weightKg: weightVal && Number.isFinite(weightVal) ? weightVal : null,
            caption: caption.trim() || null,
          })
          setProgress('done')
          router.refresh()
          setTimeout(resetUpload, 1500)
        } catch (e) {
          // Registration failed — drop the just-uploaded object so we don't
          // leave an orphaned private file consuming the user's storage.
          void supabase.storage.from('progress-photos').remove([path])
          setProgress('error')
          setUploadError(e instanceof Error ? e.message : 'Failed to save')
        }
      })
    } catch (e) {
      setProgress('error')
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  function openCell(idx: number) {
    if (compareMode) {
      if (!comparePair) setComparePair([idx, idx])
      else if (comparePair[0] === idx) return
      else {
        setComparePos(50)
        setComparePair([comparePair[0], idx])
      }
    } else {
      setViewerIdx(idx)
    }
  }

  function closeViewer() {
    setViewerIdx(null)
    setConfirmDeleteId(null)
  }

  function prevPhoto() {
    if (viewerIdx === null) return
    setViewerIdx((viewerIdx - 1 + photos.length) % photos.length)
    setConfirmDeleteId(null)
  }

  function nextPhoto() {
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
    if (dx > 0) prevPhoto()
    else nextPhoto()
  }

  function deletePhoto(photoId: string) {
    startTransition(async () => {
      try {
        await deleteProgressPhotoAction(photoId)
        closeViewer()
      } catch {
        // ignore
      }
    })
  }

  const active = viewerIdx !== null ? photos[viewerIdx] : null

  // Older shot on the base layer (before), newer clipped on top (after)
  const pair = compareOpen
    ? [photos[comparePair[0]], photos[comparePair[1]]].sort(
        (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
      )
    : null
  const weightDiff =
    pair && pair[0].weight_kg != null && pair[1].weight_kg != null
      ? pair[1].weight_kg - pair[0].weight_kg
      : null

  const silhouette = (
    <span className="tar-ph-img">
      <User className="i" strokeWidth={1.2} />
    </span>
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={handlePick}
        className="hidden"
      />

      {photos.length === 0 && !file ? (
        <div className="tar-ph-hero tar-d-rise tar-d-rise-3">
          <span className="pico">
            <Camera className="i" />
          </span>
          <div className="t">{t('emptyTitle')}</div>
          <div className="s">{t('emptySub')}</div>
          <button type="button" className="tar-cta" onClick={() => fileInputRef.current?.click()}>
            {t('pickFile')}
          </button>
          <div className="max">{t('formats')}</div>
        </div>
      ) : (
        <>
          {photos.length >= 2 && (
            <div className="tar-ph-bar tar-d-rise tar-d-rise-2">
              <span className="tar-ph-count">
                {photos.length} {t('count')}
              </span>
              <button
                type="button"
                className="tar-ph-cmpbtn"
                onClick={() => {
                  setCompareMode((v) => !v)
                  setComparePair(null)
                }}
                style={
                  compareMode
                    ? {
                        color: 'var(--tar-brand-2)',
                        borderColor: 'rgba(255, 150, 60, 0.45)',
                        background: 'var(--tar-card-hot)',
                      }
                    : undefined
                }
              >
                <GitCompare className="i" />
                {compareMode ? t('compareCancel') : t('compare')}
              </button>
            </div>
          )}

          {compareMode && (
            <p
              style={{
                font: '500 10px/1.5 var(--tar-mono)',
                letterSpacing: '0.08em',
                color: 'var(--tar-ink-mute)',
                marginTop: 8,
              }}
            >
              {comparePair && comparePair[0] !== comparePair[1]
                ? t('compareReady')
                : t('comparePrompt')}
            </p>
          )}

          {file && previewUrl && (
            <div
              className="space-y-3"
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 'var(--tar-r-lg)',
                background: 'var(--tar-bg-3)',
                border: '1px solid var(--tar-line)',
              }}
            >
              <div
                className="relative overflow-hidden mx-auto"
                style={{ aspectRatio: '3 / 4', maxHeight: 320, borderRadius: 14 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                {progress === 'idle' && (
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="tar-ph-del"
                    style={{ left: 'auto', right: 6 }}
                    aria-label={t('cancel')}
                  >
                    <X className="i" />
                  </button>
                )}
              </div>

              <div className="tar-ms-grid" style={{ marginTop: 0 }}>
                <label className="tar-ms-field">
                  <span className="lbl">{t('weightPlaceholder')}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max="500"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="—"
                    className="tabular-nums"
                  />
                </label>
                <label className="tar-ms-field">
                  <span className="lbl">{t('captionPlaceholder')}</span>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 80))}
                    placeholder="—"
                  />
                </label>
              </div>

              {uploadError && (
                <p className="text-xs" style={{ color: 'var(--tar-danger)' }}>
                  {uploadError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={progress === 'uploading' || progress === 'saving'}
                  className="tar-cta"
                  style={{ flex: 1 }}
                >
                  {progress === 'uploading' && (
                    <>
                      <Loader2 className="i animate-spin" style={{ width: 16, height: 16 }} />
                      {t('uploading')}
                    </>
                  )}
                  {progress === 'saving' && (
                    <>
                      <Loader2 className="i animate-spin" style={{ width: 16, height: 16 }} />
                      {t('saving')}
                    </>
                  )}
                  {progress === 'done' && (
                    <>
                      <Check className="i" style={{ width: 16, height: 16 }} />
                      {t('saved')}
                    </>
                  )}
                  {(progress === 'idle' || progress === 'error') && t('save')}
                </button>
                <button
                  type="button"
                  onClick={resetUpload}
                  disabled={progress === 'uploading' || progress === 'saving'}
                  className="tar-cta-ghost"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="tar-ph-grid tar-d-rise tar-d-rise-3">
            {!file && (
              <button
                type="button"
                className="tar-ph-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="pico">
                  <Camera className="i" />
                </span>
                <span className="t">
                  {t('addLabel')}
                  <br />
                  {t('maxSize')}
                </span>
              </button>
            )}
            {photos.map((p, i) => {
              const selectedForCompare = compareMode && comparePair?.includes(i)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openCell(i)}
                  className="tar-ph-cell"
                  style={
                    selectedForCompare
                      ? { outline: '2px solid var(--tar-brand-2)', outlineOffset: '-2px' }
                      : undefined
                  }
                >
                  {p.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.signed_url} alt={p.caption ?? ''} loading="lazy" />
                  ) : (
                    silhouette
                  )}
                  {p.weight_kg != null && (
                    <span className="wt tabular-nums">
                      {p.weight_kg} {kg}
                    </span>
                  )}
                  <span className="dt">{formatDate(p.taken_at)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Before/after compare with drag slider */}
      {pair && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--tar-bg)' }}>
          <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 18px 26px' }}>
            <button type="button" className="tar-fr-back" onClick={() => setComparePair(null)}>
              <ChevronLeft className="i" strokeWidth={2.5} />
              {t('back')}
            </button>
            <h1 className="tar-fr-h">{t('compareTitle')}</h1>

            <div
              className="tar-ph-compare"
              style={{ '--pos': `${comparePos}%` } as React.CSSProperties}
            >
              <span className="lay">
                {pair[0].signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pair[0].signed_url} alt={t('before')} />
                ) : (
                  silhouette
                )}
              </span>
              <span className="lay after">
                {pair[1].signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pair[1].signed_url} alt={t('after')} />
                ) : (
                  silhouette
                )}
              </span>
              <span className="tar-ph-tag l">{t('before')}</span>
              <span className="tar-ph-tag r">{t('after')}</span>
              <span className="tar-ph-div" />
              <span className="tar-ph-knob">
                <MoveHorizontal className="i" strokeWidth={2.5} />
              </span>
              <input
                type="range"
                className="tar-ph-range"
                min={8}
                max={92}
                value={comparePos}
                onChange={(e) => setComparePos(Number(e.target.value))}
                aria-label={t('compareTitle')}
              />
            </div>

            <div className="tar-ph-meta">
              <span className="d">
                {formatDate(pair[0].taken_at)}
                {pair[0].weight_kg != null && (
                  <b className="tabular-nums">
                    {pair[0].weight_kg} {kg}
                  </b>
                )}
              </span>
              {weightDiff != null && Math.abs(weightDiff) >= 0.05 && (
                <span className="diff tabular-nums">
                  {weightDiff < 0 ? (
                    <ArrowDown className="i" strokeWidth={2.5} />
                  ) : (
                    <ArrowUp className="i" strokeWidth={2.5} />
                  )}
                  {Math.abs(weightDiff).toLocaleString(loc, { maximumFractionDigits: 1 })} {kg}
                </span>
              )}
              <span className="d" style={{ textAlign: 'right' }}>
                {formatDate(pair[1].taken_at)}
                {pair[1].weight_kg != null && (
                  <b className="tabular-nums">
                    {pair[1].weight_kg} {kg}
                  </b>
                )}
              </span>
            </div>

            <p className="tar-rm-hint" style={{ textAlign: 'center' }}>
              {t('compareHint')}
            </p>
          </div>
        </div>
      )}

      {/* Single photo viewer */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'var(--tar-bg)' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between p-3">
            <button
              type="button"
              onClick={closeViewer}
              className="tar-w-iconbtn"
              aria-label={t('back')}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p
                style={{
                  font: '700 12px/1 var(--tar-mono)',
                  letterSpacing: '0.1em',
                  color: 'var(--tar-ink)',
                }}
              >
                {formatDate(active.taken_at)}
              </p>
              {active.weight_kg != null && (
                <p
                  className="tabular-nums"
                  style={{
                    font: '600 11px/1 var(--tar-mono)',
                    color: 'var(--tar-brand-2)',
                    marginTop: 5,
                  }}
                >
                  {active.weight_kg} {kg}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(active.id)}
              className="tar-w-iconbtn"
              aria-label={t('deleteYes')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-2 relative">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={prevPhoto}
                className="tar-w-iconbtn absolute left-2 z-10"
                aria-label="←"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {active.signed_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.signed_url}
                alt=""
                className="max-w-full max-h-full object-contain"
                style={{ borderRadius: 12 }}
              />
            )}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={nextPhoto}
                className="tar-w-iconbtn absolute right-2 z-10"
                aria-label="→"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {active.caption && (
            <p
              className="px-4 pb-3 text-center"
              style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-dim)' }}
            >
              {active.caption}
            </p>
          )}

          {confirmDeleteId === active.id && (
            <div
              className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-3"
              style={{
                background: 'rgba(10, 10, 15, 0.92)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid var(--tar-line)',
              }}
            >
              <p
                className="flex-1"
                style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-dim)' }}
              >
                {t('confirmDelete')}
              </p>
              <button
                type="button"
                onClick={() => deletePhoto(active.id)}
                className="h-10 px-4"
                style={{
                  borderRadius: 11,
                  background: 'var(--tar-danger)',
                  color: '#fff',
                  font: '800 12px/1 var(--tar-text)',
                  border: 0,
                }}
              >
                {t('deleteYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="h-10 px-4"
                style={{
                  borderRadius: 11,
                  background: 'var(--tar-card)',
                  border: '1px solid var(--tar-line)',
                  color: 'var(--tar-ink-dim)',
                  font: '600 12px/1 var(--tar-text)',
                }}
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
