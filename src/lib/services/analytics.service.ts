import type { SupabaseClient } from '@supabase/supabase-js'
import type { MuscleVolume, VolumeLandmark, MuscleGroup } from '@/lib/types/models'
import { calculateSessionVolume } from '@/lib/utils/muscle-volume'
import { parentMuscle } from '@/lib/utils/muscle-groups'
import { dropWarmupSets, type LoggedSetShape } from './warmup.service'
import { unwrapRows } from '@/lib/db/unwrap'

export interface TonnageByMonth {
  month: string // 'YYYY-MM'
  total_kg: number
}

interface ExerciseMuscleRow extends LoggedSetShape {
  exercise_id: string
  exercises: {
    primary_muscle: MuscleGroup
    secondary_muscles: MuscleGroup[]
  } | null
}

export async function getMonthlyTonnage(
  supabase: SupabaseClient,
  userId: string,
): Promise<TonnageByMonth[]> {
  const data = unwrapRows(
    await supabase
      .from('workout_sessions')
      .select('started_at, total_volume_kg')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('started_at'),
    'monthly volume',
  )
  if (data.length === 0) return []

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
  weeks = 1,
): Promise<MuscleVolume[]> {
  return getMuscleVolumeForDays(supabase, userId, Math.max(1, weeks) * 7)
}

export async function getMuscleVolumeForDays(
  supabase: SupabaseClient,
  userId: string,
  days = 7,
): Promise<MuscleVolume[]> {
  const now = new Date()
  const since = new Date(now)
  since.setUTCDate(now.getUTCDate() - Math.max(1, days))
  since.setUTCHours(0, 0, 0, 0)

  const data = unwrapRows(
    await supabase
      .from('set_entries')
      .select(
        'exercise_id, session_id, weight_kg, created_at, exercises(primary_muscle, secondary_muscles)',
      )
      .eq('user_id', userId)
      .eq('is_warmup', false)
      .gte('created_at', since.toISOString()),
    'volume landmarks',
  )
  if (data.length === 0) return []

  const exerciseMap = new Map<
    string,
    { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[]; setCount: number }
  >()

  // Weekly set counts drive the MRV/overtraining landmarks. A hand-logged
  // warm-up ramp carries no `is_warmup` flag, so without this it inflates
  // every muscle's weekly volume by the size of the ramp.
  for (const row of dropWarmupSets(data as unknown as ExerciseMuscleRow[])) {
    const ex = row.exercises
    if (!ex) continue
    const existing = exerciseMap.get(row.exercise_id)
    if (existing) {
      existing.setCount++
    } else {
      exerciseMap.set(row.exercise_id, { ...ex, setCount: 1 })
    }
  }

  const fakeExercises = Array.from(exerciseMap.values()).map((ex) => ({
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

/**
 * Weekly volume per muscle, with the regions it was trained through listed
 * underneath it.
 *
 * The verdict is taken on the group, not the region: recovery is a property of
 * the muscle, so six sets of incline press is not an under-trained chest when
 * flat and decline bring the week to eighteen. The regions are still reported,
 * because "all eighteen were flat" is the thing worth seeing.
 */
export function getVolumeLandmarks(muscleVolumes: MuscleVolume[]): VolumeLandmark[] {
  const byParent = new Map<MuscleGroup, { total: number; regions: MuscleVolume[] }>()
  for (const mv of muscleVolumes) {
    const parent = parentMuscle(mv.muscle)
    const entry = byParent.get(parent) ?? { total: 0, regions: [] }
    entry.total += mv.total_sets
    entry.regions.push(mv)
    byParent.set(parent, entry)
  }

  return Array.from(byParent.entries()).map(([muscle, { total, regions }]) => {
    let status: VolumeLandmark['status']
    if (total < 6) status = 'mv'
    else if (total >= 25) status = 'mrv'
    else status = 'optimal'

    const isSplit = regions.length > 1 || regions[0].muscle !== muscle
    return {
      muscle,
      weekly_sets: total,
      status,
      ...(isSplit
        ? {
            regions: regions
              .map((r) => ({ muscle: r.muscle, weekly_sets: r.total_sets }))
              .sort((a, b) => b.weekly_sets - a.weekly_sets),
          }
        : {}),
    }
  })
}
