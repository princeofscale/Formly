'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { StickyNote, Check } from 'lucide-react'
import { updateNotesAction } from '@/app/(app)/workout/[id]/actions'

interface Props {
  sessionId: string
  initialNotes: string | null
}

const SAVE_DEBOUNCE_MS = 800
const MAX_LENGTH = 2000

export function WorkoutNotes({ sessionId, initialNotes }: Props) {
  const t = useTranslations('workout.notes')
  const [value, setValue] = useState(initialNotes ?? '')
  const [open, setOpen] = useState(!!initialNotes)
  const [savedTick, setSavedTick] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(initialNotes ?? '')

  function scheduleSave(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (next === lastSavedRef.current) return
      try {
        await updateNotesAction(sessionId, next)
        lastSavedRef.current = next
        setSavedTick(true)
        setTimeout(() => setSavedTick(false), 1500)
      } catch (e) {
        console.error('[notes] save failed:', e)
      }
    }, SAVE_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.slice(0, MAX_LENGTH)
    setValue(next)
    scheduleSave(next)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 transition-colors"
        style={{
          height: 40,
          borderRadius: 12,
          background: 'var(--tar-card)',
          border: '1px solid var(--tar-line)',
          color: 'var(--tar-ink-mute)',
          font: '600 12px/1 var(--tar-mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <StickyNote className="h-3.5 w-3.5" />
        {t('add')}
      </button>
    )
  }

  return (
    <div
      className="space-y-2"
      style={{
        padding: 14,
        borderRadius: 'var(--tar-r-lg)',
        background: 'var(--tar-card)',
        border: '1px solid var(--tar-line)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="tar-d-eyebrow flex items-center gap-1.5">
          <StickyNote className="h-3 w-3" />
          {t('label')}
        </div>
        {savedTick && (
          <div
            className="flex items-center gap-1 animate-in fade-in duration-200"
            style={{
              color: 'var(--tar-success)',
              font: '600 10px/1 var(--tar-mono)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            <Check className="h-3 w-3" />
            <span>{t('saved')}</span>
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={t('placeholder')}
        rows={3}
        maxLength={MAX_LENGTH}
        className="w-full bg-transparent outline-none resize-y"
        style={{
          color: 'var(--tar-ink)',
          font: '500 13px/1.5 var(--tar-text)',
        }}
      />
    </div>
  )
}
