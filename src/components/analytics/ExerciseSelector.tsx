'use client'

import { useRouter } from 'next/navigation'
import type { Exercise } from '@/lib/types/models'

export function ExerciseSelector({
  exercises,
  selected,
  locale,
}: {
  exercises: Exercise[]
  selected?: string
  locale?: string
}) {
  const router = useRouter()
  return (
    <select
      className="rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition-colors"
      style={{
        background: 'var(--tar-card)',
        border: '1px solid var(--tar-line)',
        color: 'var(--tar-ink-dim)',
        fontFamily: 'var(--tar-mono)',
        letterSpacing: '0.04em',
      }}
      defaultValue={selected}
      onChange={(e) => router.push(`/analytics?exercise=${e.target.value}`)}
    >
      {exercises.map((e) => (
        <option key={e.id} value={e.id} className="bg-zinc-900 text-white">
          {locale === 'ru' ? (e.name_ru ?? e.name) : e.name}
        </option>
      ))}
    </select>
  )
}
