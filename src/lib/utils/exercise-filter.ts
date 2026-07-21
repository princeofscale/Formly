// Pure filtering for the full-screen exercise picker: the whole catalog is
// already client-side, so search runs locally (instant, works offline).
import type { Exercise, MuscleGroup } from '@/lib/types/models'

export type MuscleChip =
  | 'all'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'other'

export const CHIP_MUSCLES: Record<Exclude<MuscleChip, 'all'>, MuscleGroup[]> = {
  chest: ['chest'],
  back: ['back', 'lats', 'traps'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
  other: ['forearms', 'cardio'],
}

export const MUSCLE_CHIPS: MuscleChip[] = [
  'all',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'core',
  'other',
]

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim()
}

export function matchesChip(ex: Exercise, chip: MuscleChip): boolean {
  if (chip === 'all') return true
  return CHIP_MUSCLES[chip].includes(ex.primary_muscle)
}

// Prefix matches (name, name_ru or alias) rank above substring matches;
// both respect the active chip.
export function filterExercises(
  all: Exercise[],
  query: string,
  chip: MuscleChip,
  limit = 50,
): Exercise[] {
  const q = normalizeQuery(query)
  if (q.length < 2) return []
  const starts: Exercise[] = []
  const contains: Exercise[] = []
  for (const ex of all) {
    if (!matchesChip(ex, chip)) continue
    const names = [ex.name, ex.name_ru ?? ''].map(normalizeQuery)
    const aliases = (ex.aliases ?? []).map(normalizeQuery)
    if (names.some((n) => n.startsWith(q)) || aliases.some((a) => a.startsWith(q))) {
      starts.push(ex)
    } else if (names.some((n) => n.includes(q)) || aliases.some((a) => a.includes(q))) {
      contains.push(ex)
    }
  }
  return [...starts, ...contains].slice(0, limit)
}
