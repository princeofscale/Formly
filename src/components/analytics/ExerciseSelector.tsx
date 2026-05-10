'use client'

import { useRouter } from 'next/navigation'
import type { Exercise } from '@/lib/types/models'

export function ExerciseSelector({ exercises, selected }: { exercises: Exercise[]; selected?: string }) {
  const router = useRouter()
  return (
    <select
      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
      defaultValue={selected}
      onChange={e => router.push(`/analytics?exercise=${e.target.value}`)}
    >
      {exercises.map(e => (
        <option key={e.id} value={e.id}>{e.name}</option>
      ))}
    </select>
  )
}
