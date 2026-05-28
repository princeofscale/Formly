import type { Exercise, SetEntry, MuscleVolume, MuscleGroup } from '@/lib/types/models'

interface ExerciseSetPair {
  exercise: Exercise
  sets: SetEntry[]
}

export function calculateSessionVolume(items: ExerciseSetPair[]): MuscleVolume[] {
  if (items.length === 0) return []

  const map = new Map<MuscleGroup, { direct: number; indirect: number }>()

  for (const { exercise, sets } of items) {
    if (sets.length === 0) continue
    if (exercise.primary_muscle === 'cardio') continue
    const n = sets.length

    const primary = map.get(exercise.primary_muscle) ?? { direct: 0, indirect: 0 }
    map.set(exercise.primary_muscle, { ...primary, direct: primary.direct + n })

    for (const muscle of exercise.secondary_muscles) {
      if (muscle === 'cardio') continue
      const sec = map.get(muscle) ?? { direct: 0, indirect: 0 }
      map.set(muscle, { ...sec, indirect: sec.indirect + n * 0.5 })
    }
  }

  return Array.from(map.entries()).map(([muscle, { direct, indirect }]) => ({
    muscle,
    direct_sets: direct,
    indirect_sets: indirect,
    total_sets: direct + indirect,
  }))
}
