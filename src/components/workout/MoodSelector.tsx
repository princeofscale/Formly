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
    <div className="space-y-2">
      <div className="tar-d-eyebrow">{t('label')}</div>
      <div className="flex gap-1.5">
        {MOODS.map((m) => {
          const active = mood === m.value
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => handlePick(m.value)}
              title={t(m.labelKey)}
              className="flex-1 transition-all"
              style={{
                height: 44,
                borderRadius: 12,
                fontSize: 22,
                background: active ? 'var(--tar-brand-grad-soft)' : 'var(--tar-card)',
                border: active
                  ? '1.5px solid rgba(255, 182, 39, 0.7)'
                  : '1px solid var(--tar-line)',
                boxShadow: active ? '0 4px 18px rgba(255, 107, 53, 0.22)' : undefined,
                opacity: active ? 1 : 0.55,
              }}
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
