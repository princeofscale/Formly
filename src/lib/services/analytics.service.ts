import type { SupabaseClient } from '@supabase/supabase-js'
import type { MuscleVolume, VolumeLandmark, MuscleGroup } from '@/lib/types/models'
import { calculateSessionVolume } from '@/lib/utils/muscle-volume'

export interface TonnageByMonth {
  month: string  // 'YYYY-MM'
  total_kg: number
}

export async function getMonthlyTonnage(
  supabase: SupabaseClient,
  userId: string
): Promise<TonnageByMonth[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at, total_volume_kg')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at')

  if (!data) return []

  const byMonth = new Map<string, number>()
  for (const s of data) {
    const month = s.started_at.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + (s.total_volume_kg ?? 0))
  }

  return Array.from(byMonth.entries()).map(([month, total_kg]) => ({ month, total_kg }))
}

export async function getWeeklyMuscleVolume(
  supabase: SupabaseClient,
  userId: string,
  weeks = 4
): Promise<MuscleVolume[]> {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, exercises(primary_muscle, secondary_muscles)')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (!data) return []

  // Count sets per exercise
  const exerciseMap = new Map<string, { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[]; setCount: number }>()

  for (const row of data) {
    const ex = row.exercises as { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[] } | null
    if (!ex) continue
    const existing = exerciseMap.get(row.exercise_id)
    if (existing) {
      existing.setCount++
    } else {
      exerciseMap.set(row.exercise_id, { ...ex, setCount: 1 })
    }
  }

  // Build ExerciseSetPair-compatible objects for calculateSessionVolume
  const fakeExercises = Array.from(exerciseMap.values()).map(ex => ({
    exercise: { primary_muscle: ex.primary_muscle, secondary_muscles: ex.secondary_muscles } as any,
    sets: Array.from({ length: ex.setCount }, () => ({}) as any),
  }))

  return calculateSessionVolume(fakeExercises)
}

export function getVolumeLandmarks(muscleVolumes: MuscleVolume[]): VolumeLandmark[] {
  return muscleVolumes.map(mv => {
    let status: VolumeLandmark['status']
    if (mv.total_sets < 6) status = 'mv'
    else if (mv.total_sets >= 25) status = 'mrv'
    else status = 'optimal'

    return { muscle: mv.muscle, weekly_sets: mv.total_sets, status }
  })
}
