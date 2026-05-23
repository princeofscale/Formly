import type { SupabaseClient } from '@supabase/supabase-js'
import type { MuscleVolume, VolumeLandmark, MuscleGroup } from '@/lib/types/models'
import { calculateSessionVolume } from '@/lib/utils/muscle-volume'

export interface TonnageByMonth {
  month: string  // 'YYYY-MM'
  total_kg: number
}

interface ExerciseMuscleRow {
  exercise_id: string
  exercises: {
    primary_muscle: MuscleGroup
    secondary_muscles: MuscleGroup[]
  } | null
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
  weeks = 1
): Promise<MuscleVolume[]> {
  return getMuscleVolumeForDays(supabase, userId, Math.max(1, weeks) * 7)
}

export async function getMuscleVolumeForDays(
  supabase: SupabaseClient,
  userId: string,
  days = 7
): Promise<MuscleVolume[]> {
  const now = new Date()
  const since = new Date(now)
  since.setUTCDate(now.getUTCDate() - Math.max(1, days))
  since.setUTCHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, exercises(primary_muscle, secondary_muscles)')
    .eq('user_id', userId)
    .eq('is_warmup', false)
    .gte('created_at', since.toISOString())

  if (!data) return []

  const exerciseMap = new Map<string, { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[]; setCount: number }>()

  for (const row of data as unknown as ExerciseMuscleRow[]) {
    const ex = row.exercises
    if (!ex) continue
    const existing = exerciseMap.get(row.exercise_id)
    if (existing) {
      existing.setCount++
    } else {
      exerciseMap.set(row.exercise_id, { ...ex, setCount: 1 })
    }
  }

  const fakeExercises = Array.from(exerciseMap.values()).map(ex => ({
    exercise: {
      id: '',
      name: '',
      slug: '',
      primary_muscle: ex.primary_muscle,
      secondary_muscles: ex.secondary_muscles,
      mechanic: 'compound' as const,
      equipment: 'other' as const,
      is_custom: false,
      created_by: null,
    },
    sets: Array.from({ length: ex.setCount }, (_, index) => ({
      id: String(index),
      session_id: '',
      user_id: userId,
      exercise_id: '',
      set_number: index + 1,
      weight_kg: 0,
      reps: 0,
      rpe: null,
      calculated_1rm: null,
      rest_seconds: null,
      created_at: '',
    })),
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
