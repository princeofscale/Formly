'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { StickyNote, Check } from 'lucide-react'
import { updateExerciseNoteAction } from '@/app/(app)/workout/[id]/actions'

interface Props {
  exerciseId: string
  initialNote: string
}

const SAVE_DEBOUNCE_MS = 800
const MAX_LENGTH = 1000

export function ExerciseNoteEditor({ exerciseId, initialNote }: Props) {
  const t = useTranslations('workout.exerciseNote')
  const [value, setValue] = useState(initialNote)
  const [open, setOpen] = useState(initialNote.trim().length > 0)
  const [savedTick, setSavedTick] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(initialNote)

  function scheduleSave(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (next === lastSavedRef.current) return
      try {
        await updateExerciseNoteAction(exerciseId, next)
        lastSavedRef.current = next
        setSavedTick(true)
        setTimeout(() => setSavedTick(false), 1200)
      } catch (e) {
        console.error('[exerciseNote] save failed:', e)
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
        className="w-full flex items-center justify-center gap-1.5 h-8 rounded-[10px] text-[11px] transition-colors"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <StickyNote className="h-3 w-3" />
        {t('add')}
      </button>
    )
  }

  return (
    <div
      className="rounded-[10px] p-2.5 space-y-1.5"
      style={{
        background: 'rgba(255,59,71,0.04)',
        border: '1px solid rgba(255,59,71,0.18)',
      }}
    >
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest">
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,59,71,0.7)' }}>
          <StickyNote className="h-2.5 w-2.5" />
          <span className="font-bold">{t('label')}</span>
        </div>
        {savedTick && (
          <div className="flex items-center gap-0.5 text-green-400 animate-in fade-in duration-150">
            <Check className="h-2.5 w-2.5" />
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={t('placeholder')}
        rows={2}
        maxLength={MAX_LENGTH}
        className="w-full bg-transparent text-xs outline-none resize-y leading-snug"
        style={{ color: '#FFFFFF' }}
      />
    </div>
  )
}
