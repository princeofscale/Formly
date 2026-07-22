import type { SupabaseClient } from '@supabase/supabase-js'

export interface SessionPR {
  exerciseId: string
  exerciseName: string
  exerciseNameRu: string | null
  newBest: number
  previousBest: number
  improvementPct: number | null
}

export interface SessionSummary {
  durationMinutes: number | null
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  topExercises: Array<{
    exerciseId: string
    name: string
    nameRu: string | null
    volume: number
    sets: number
  }>
  prs: SessionPR[]
  comparison: {
    prevTonnage: number | null
    deltaTonnagePct: number | null // null when no previous session
    prevDurationMinutes: number | null
  } | null
}

export async function getSessionSummary(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<SessionSummary | null> {
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id, started_at, finished_at, total_volume_kg, session_type')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (!session) return null

  const startedAt = new Date(session.started_at as string)
  const finishedAt = session.finished_at ? new Date(session.finished_at as string) : null
  const durationMinutes = finishedAt
    ? Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000))
    : null

  // All sets of this session, joined with exercise names
  const { data: setRows } = await supabase
    .from('set_entries')
    .select('exercise_id, weight_kg, reps, is_warmup, exercises(name, name_ru)')
    .eq('user_id', userId)
    .eq('session_id', sessionId)

  const sets = (setRows ?? []) as unknown as Array<{
    exercise_id: string
    weight_kg: number
    reps: number
    is_warmup: boolean | null
    exercises:
      | { name: string; name_ru: string | null }
      | { name: string; name_ru: string | null }[]
      | null
  }>

  let totalSets = 0
  let totalReps = 0
  let totalVolumeKg = 0
  const perExercise = new Map<
    string,
    { name: string; nameRu: string | null; volume: number; sets: number; bestWeight: number }
  >()

  for (const s of sets) {
    const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
    totalSets += 1
    totalReps += s.reps
    totalVolumeKg += s.weight_kg * s.reps
    const entry = perExercise.get(s.exercise_id) ?? {
      name: ex?.name ?? '',
      nameRu: ex?.name_ru ?? null,
      volume: 0,
      sets: 0,
      bestWeight: 0,
    }
    entry.volume += s.weight_kg * s.reps
    entry.sets += 1
    if (!s.is_warmup && s.weight_kg > entry.bestWeight) entry.bestWeight = s.weight_kg
    perExercise.set(s.exercise_id, entry)
  }

  const topExercises = Array.from(perExercise.entries())
    .map(([exerciseId, v]) => ({
      exerciseId,
      name: v.name,
      nameRu: v.nameRu,
      volume: Math.round(v.volume),
      sets: v.sets,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)

  // PR detection: for each exercise touched, compare the in-session heaviest
  // working set vs. the all-time best from sets *outside* this session.
  const exerciseIds = Array.from(perExercise.keys())
  const prs: SessionPR[] = []
  if (exerciseIds.length > 0) {
    const { data: histRows } = await supabase
      .from('set_entries')
      .select('exercise_id, weight_kg, session_id')
      .eq('user_id', userId)
      .in('exercise_id', exerciseIds)
      .eq('is_warmup', false)
      .gt('weight_kg', 0)
      .neq('session_id', sessionId)

    const bestByExercise = new Map<string, number>()
    for (const row of (histRows ?? []) as Array<{
      exercise_id: string
      weight_kg: number | null
    }>) {
      if (row.weight_kg == null) continue
      const cur = bestByExercise.get(row.exercise_id) ?? 0
      if (row.weight_kg > cur) bestByExercise.set(row.exercise_id, row.weight_kg)
    }

    for (const [exId, entry] of perExercise.entries()) {
      if (entry.bestWeight <= 0) continue
      const prev = bestByExercise.get(exId) ?? 0
      // First-ever result only sets the baseline — not celebrated as a PR.
      if (prev > 0 && entry.bestWeight > prev) {
        prs.push({
          exerciseId: exId,
          exerciseName: entry.name,
          exerciseNameRu: entry.nameRu,
          newBest: Math.round(entry.bestWeight * 10) / 10,
          previousBest: Math.round(prev * 10) / 10,
          improvementPct: Math.round(((entry.bestWeight - prev) / prev) * 1000) / 10,
        })
      }
    }
    prs.sort((a, b) => (b.improvementPct ?? 999) - (a.improvementPct ?? 999))
  }

  // Comparison: previous strength session by started_at desc, excluding current
  let comparison: SessionSummary['comparison'] = null
  if (session.session_type !== 'cardio') {
    const { data: prevRows } = await supabase
      .from('workout_sessions')
      .select('started_at, finished_at, total_volume_kg, session_type')
      .eq('user_id', userId)
      .neq('id', sessionId)
      .not('finished_at', 'is', null)
      .neq('session_type', 'cardio')
      .lt('started_at', session.started_at as string)
      .order('started_at', { ascending: false })
      .limit(1)

    const prev = (prevRows ?? [])[0] as
      | { started_at: string; finished_at: string; total_volume_kg: number | null }
      | undefined

    if (prev) {
      const prevTonnage = prev.total_volume_kg ?? 0
      const prevDur = Math.max(
        0,
        Math.round(
          (new Date(prev.finished_at).getTime() - new Date(prev.started_at).getTime()) / 60000,
        ),
      )
      const deltaPct =
        prevTonnage > 0
          ? Math.round(((totalVolumeKg - prevTonnage) / prevTonnage) * 1000) / 10
          : null
      comparison = {
        prevTonnage: Math.round(prevTonnage),
        deltaTonnagePct: deltaPct,
        prevDurationMinutes: prevDur,
      }
    }
  }

  return {
    durationMinutes,
    totalSets,
    totalReps,
    totalVolumeKg: Math.round(totalVolumeKg),
    topExercises,
    prs,
    comparison,
  }
}
