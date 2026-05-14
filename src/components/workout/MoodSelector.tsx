'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateMoodAction } from '@/app/(app)/workout/[id]/actions'

const MOODS: { value: number; emoji: string; labelKey: string }[] = [
  { value: 1, emoji: '😣', labelKey: 'bad' },
  { value: 2, emoji: '😕', labelKey: 'meh' },
  { value: 3, emoji: '😐', labelKey: 'ok' },
  { value: 4, emoji: '🙂', labelKey: 'good' },
  { value: 5, emoji: '🔥', labelKey: 'great' },
]

interface Props {
  sessionId: string
  initialMood: number | null
}

export function MoodSelector({ sessionId, initialMood }: Props) {
  const t = useTranslations('workout.mood')
  const [mood, setMood] = useState<number | null>(initialMood)
  const [, startTransition] = useTransition()

  function handlePick(value: number) {
    const next = mood === value ? null : value
    setMood(next)
    startTransition(async () => {
      try {
        await updateMoodAction(sessionId, next)
      } catch (e) {
        console.error('[mood] save failed:', e)
      }
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
        {t('label')}
      </div>
      <div className="flex gap-1.5">
        {MOODS.map(m => {
          const active = mood === m.value
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => handlePick(m.value)}
              title={t(m.labelKey)}
              className={`flex-1 h-10 rounded-lg text-xl transition-all ${
                active
                  ? 'bg-amber-500/20 border border-amber-500/40 scale-105'
                  : 'bg-white/3 border border-white/8 hover:bg-white/8 opacity-60 hover:opacity-100'
              }`}
            >
              {m.emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const MOOD_EMOJIS = MOODS.reduce<Record<number, string>>((acc, m) => {
  acc[m.value] = m.emoji
  return acc
}, {})
