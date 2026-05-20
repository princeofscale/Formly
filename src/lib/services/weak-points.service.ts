import type { MuscleGroup, MuscleVolume } from '@/lib/types/models'

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'biceps', 'triceps',
  'forearms', 'core', 'quads', 'hamstrings', 'glutes',
  'calves', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts',
]

// Research-based weekly Minimum Volume per muscle group (sets/week).
// Numbers blend Schoenfeld, Israetel (RP), and common evidence-based ranges.
const WEEKLY_MV: Record<MuscleGroup, number> = {
  chest: 8,
  back: 10,
  lats: 10,
  traps: 4,
  front_delts: 6,
  side_delts: 6,
  rear_delts: 6,
  biceps: 6,
  triceps: 6,
  forearms: 2,
  core: 6,
  quads: 8,
  hamstrings: 6,
  glutes: 8,
  calves: 6,
}

export interface WeakPoint {
  muscle: MuscleGroup
  weekly_sets_avg: number
  target_mv: number
  deficit_pct: number  // 100 = zero work, 0 = at MV
}

/**
 * Identifies undertrained muscles based on average weekly sets over the period.
 *
 * @param volumes - MuscleVolume[] computed across N days
 * @param weeks - how many weeks the volumes represent (for averaging)
 * @returns up to `limit` muscles sorted by largest deficit
 */
export function detectWeakPoints(
  volumes: MuscleVolume[],
  weeks: number,
  limit = 3
): WeakPoint[] {
  const safeWeeks = Math.max(1, weeks)
  const byMuscle = new Map<MuscleGroup, number>()
  for (const v of volumes) byMuscle.set(v.muscle, v.total_sets)

  const candidates: WeakPoint[] = []
  for (const muscle of ALL_MUSCLES) {
    const totalSets = byMuscle.get(muscle) ?? 0
    const avgPerWeek = totalSets / safeWeeks
    const target = WEEKLY_MV[muscle]
    if (avgPerWeek >= target) continue
    const deficit = 100 * (1 - avgPerWeek / target)
    candidates.push({
      muscle,
      weekly_sets_avg: Math.round(avgPerWeek * 10) / 10,
      target_mv: target,
      deficit_pct: Math.round(deficit),
    })
  }

  return candidates
    .sort((a, b) => b.deficit_pct - a.deficit_pct)
    .slice(0, limit)
}
