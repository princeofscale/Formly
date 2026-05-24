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
      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-zinc-200"
      defaultValue={selected}
      onChange={(e) => router.push(`/analytics?exercise=${e.target.value}`)}
    >
      {exercises.map((e) => (
        <option key={e.id} value={e.id}>
          {locale === 'ru' ? (e.name_ru ?? e.name) : e.name}
        </option>
      ))}
    </select>
  )
}
