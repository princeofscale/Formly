'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Pencil, X, Check, Video } from 'lucide-react'
import { updateExerciseVideoAction } from '@/app/(app)/workout/[id]/actions'

interface Props {
  exerciseId: string
  initialUrl: string
}

/**
 * Extract YouTube video ID from any common URL format:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://m.youtube.com/watch?v=ID
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const trimmed = url.trim()

  // Try parsing as URL
  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\.|^m\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      // /watch?v=ID
      const v = u.searchParams.get('v')
      if (v && /^[A-Za-z0-9_-]{6,}$/.test(v)) return v

      // /shorts/ID, /embed/ID, /live/ID
      const segments = u.pathname.split('/').filter(Boolean)
      const idx = segments.findIndex((s) => ['shorts', 'embed', 'live'].includes(s))
      if (idx >= 0 && segments[idx + 1]) {
        const id = segments[idx + 1]
        return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null
      }
    }
  } catch {
    // Not a valid URL
  }

  // Fallback: bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed

  return null
}

export function ExerciseVideo({ exerciseId, initialUrl }: Props) {
  const t = useTranslations('workout.video')
  const [url, setUrl] = useState(initialUrl)
  const [editing, setEditing] = useState(false)
  const [draftUrl, setDraftUrl] = useState(initialUrl)
  const [showError, setShowError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  const ytId = extractYouTubeId(url)

  function handleSave() {
    const id = extractYouTubeId(draftUrl)
    if (draftUrl.trim().length > 0 && !id) {
      setShowError(true)
      return
    }
    setShowError(false)
    startTransition(async () => {
      try {
        await updateExerciseVideoAction(exerciseId, draftUrl)
        setUrl(draftUrl)
        setPlaying(false)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        console.error('[video] save failed:', e)
      }
    })
  }

  function handleClear() {
    setDraftUrl('')
    startTransition(async () => {
      try {
        await updateExerciseVideoAction(exerciseId, '')
        setUrl('')
        setPlaying(false)
        setEditing(false)
      } catch (e) {
        console.error('[video] clear failed:', e)
      }
    })
  }

  // ─── Edit mode ────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div
        className="rounded-[10px] p-2.5 space-y-2"
        style={{
          background: 'rgba(255,59,71,0.04)',
          border: '1px solid rgba(255,59,71,0.18)',
        }}
      >
        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest">
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,59,71,0.7)' }}>
            <Video className="h-3 w-3" />
            <span className="font-bold">{t('editLabel')}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setDraftUrl(url)
              setShowError(false)
            }}
            className="text-zinc-500 hover:text-zinc-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <input
          type="url"
          value={draftUrl}
          onChange={(e) => {
            setDraftUrl(e.target.value)
            setShowError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
          placeholder="https://youtu.be/..."
          autoFocus
          className="w-full h-9 px-2.5 rounded-[8px] text-xs outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          }}
        />
        {showError && (
          <p className="text-[10px]" style={{ color: '#FF3B47' }}>
            {t('invalidUrl')}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-8 rounded-[8px] text-[11px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#FF3B47' }}
          >
            {t('save')}
          </button>
          {url && (
            <button
              type="button"
              onClick={handleClear}
              className="h-8 px-3 rounded-[8px] text-[11px] transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {t('remove')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── No video yet ─────────────────────────────────────────────────────────
  if (!ytId) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-center gap-1.5 h-8 rounded-[10px] text-[11px] transition-colors"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <Video className="h-3.5 w-3.5" />
        {t('add')}
      </button>
    )
  }

  // ─── Has video — lite preview, click to play ──────────────────────────────
  const thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`

  if (playing) {
    return (
      <div className="space-y-1.5">
        <div
          className="relative w-full overflow-hidden rounded-[10px]"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            title="Exercise video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            ← {t('close')}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <Pencil className="h-2.5 w-2.5" />
            {t('change')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="relative w-full overflow-hidden rounded-[10px] group transition-all"
        style={{
          aspectRatio: '16 / 9',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt="Exercise video thumbnail"
          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              background: '#FF3B47',
              boxShadow: '0 0 32px rgba(255,59,71,0.5)',
            }}
          >
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <Video className="h-2.5 w-2.5" />
          <span>{t('label')}</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-0.5 text-[10px] text-green-400 animate-in fade-in">
              <Check className="h-2.5 w-2.5" /> {t('saved')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <Pencil className="h-2.5 w-2.5" />
            {t('change')}
          </button>
        </div>
      </div>
    </div>
  )
}
