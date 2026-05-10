import type { SetEntry } from '@/lib/types/models'

export function LastTimeHint({ sets }: { sets: SetEntry[] }) {
  if (sets.length === 0) return null
  const last = sets[sets.length - 1]
  return (
    <p className="text-xs text-zinc-500">
      Last time: {last.weight_kg}kg × {last.reps}
      {last.rpe ? ` @ RPE ${last.rpe}` : ''}
    </p>
  )
}
