import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserGoal {
  id: string
  user_id: string
  exercise_id: string
  target_e1rm: number
  target_date: string | null
  starting_e1rm: number
  achieved_at: string | null
  created_at: string
}

export interface GoalWithProgress extends UserGoal {
  exercise_name: string
  exercise_name_ru: string | null
  current_e1rm: number
  progress_pct: number
}

export async function getGoalsWithProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoalWithProgress[]> {
  const { data: goalRows } = await supabase
    .from('user_goals')
    .select('*, exercises(name, name_ru)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const goals = (goalRows ?? []) as unknown as Array<
    UserGoal & { exercises: { name: string; name_ru: string | null } | { name: string; name_ru: string | null }[] | null }
  >
  if (goals.length === 0) return []

  const exerciseIds = goals.map(g => g.exercise_id)
  const { data: setData } = await supabase
    .from('set_entries')
    .select('exercise_id, calculated_1rm')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .not('calculated_1rm', 'is', null)

  const bestByExercise = new Map<string, number>()
  for (const row of (setData ?? []) as Array<{ exercise_id: string; calculated_1rm: number | null }>) {
    if (row.calculated_1rm == null) continue
    const cur = bestByExercise.get(row.exercise_id) ?? 0
    if (row.calculated_1rm > cur) bestByExercise.set(row.exercise_id, row.calculated_1rm)
  }

  return goals.map(g => {
    const exObj = Array.isArray(g.exercises) ? g.exercises[0] : g.exercises
    const current = bestByExercise.get(g.exercise_id) ?? 0
    const span = Math.max(0.01, g.target_e1rm - g.starting_e1rm)
    const made = Math.max(0, current - g.starting_e1rm)
    const pct = Math.min(1, made / span)
    return {
      ...g,
      exercise_name: exObj?.name ?? '',
      exercise_name_ru: exObj?.name_ru ?? null,
      current_e1rm: Math.round(current * 10) / 10,
      progress_pct: Math.round(pct * 1000) / 10, // 0..100
    }
  })
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  targetE1rm: number,
  targetDate: string | null,
): Promise<UserGoal> {
  // Capture user's current best as starting point so progress is measured from now
  const { data: setData } = await supabase
    .from('set_entries')
    .select('calculated_1rm')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .not('calculated_1rm', 'is', null)
    .order('calculated_1rm', { ascending: false })
    .limit(1)
    .maybeSingle()

  const startingE1rm = (setData?.calculated_1rm as number | null) ?? 0
  const alreadyAchieved = startingE1rm >= targetE1rm

  const { data, error } = await supabase
    .from('user_goals')
    .upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        target_e1rm: targetE1rm,
        target_date: targetDate,
        starting_e1rm: startingE1rm,
        achieved_at: alreadyAchieved ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,exercise_id' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as UserGoal
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/**
 * Mark goals as achieved when a new set's e1rm meets/exceeds the target.
 * Called from the set-save flow.
 */
export async function checkGoalAchievement(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  e1rm: number,
): Promise<void> {
  if (!e1rm || e1rm <= 0) return
  await supabase
    .from('user_goals')
    .update({ achieved_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .is('achieved_at', null)
    .lte('target_e1rm', e1rm)
}
