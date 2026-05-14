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
        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-white/3 border border-white/8 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors"
      >
        <StickyNote className="h-3.5 w-3.5" />
        {t('add')}
      </button>
    )
  }

  return (
    <div
      className="p-3 rounded-xl space-y-2"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <StickyNote className="h-3 w-3" />
          <span className="uppercase tracking-widest font-bold">{t('label')}</span>
        </div>
        {savedTick && (
          <div className="flex items-center gap-1 text-green-400 animate-in fade-in duration-200">
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
        className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none resize-y leading-relaxed"
      />
    </div>
  )
}
