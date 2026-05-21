import type { SupabaseClient } from '@supabase/supabase-js'

export interface MonthBucket {
  month: number // 0..11
  sessions: number
  tonnageKg: number
}

export interface WrappedTopPR {
  exerciseName: string
  exerciseNameRu: string | null
  e1rm: number
  achievedAt: string
}

export interface WrappedReport {
  year: number
  hasData: boolean
  totalSessions: number
  totalTonnageKg: number
  totalSets: number
  totalReps: number
  totalMinutes: number
  longestStreakDays: number
  favoriteHour: number | null      // 0..23 or null if no data
  bestDay: {
    date: string                    // YYYY-MM-DD
    tonnageKg: number
  } | null
  topMuscle: {
    muscle: string
    sets: number
  } | null
  topPRs: WrappedTopPR[]            // top 5 by e1rm
  monthly: MonthBucket[]            // length 12
  cardioKm: number
  cardioSessions: number
}

const MUSCLE_PRIMARY_FALLBACK = 'unknown'

export async function getWrappedReport(
  supabase: SupabaseClient,
  userId: string,
  year: number,
): Promise<WrappedReport> {
  const start = new Date(Date.UTC(year, 0, 1)).toISOString()
  const end = new Date(Date.UTC(year + 1, 0, 1)).toISOString()

  // 1) All finished sessions of the year
  const { data: sessionRows } = await supabase
    .from('workout_sessions')
    .select('id, started_at, finished_at, total_volume_kg, session_type, cardio_distance_km')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .gte('started_at', start)
    .lt('started_at', end)
    .order('started_at', { ascending: true })

  const sessions = (sessionRows ?? []) as Array<{
    id: string
    started_at: string
    finished_at: string
    total_volume_kg: number | null
    session_type: string | null
    cardio_distance_km: number | null
  }>

  if (sessions.length === 0) {
    return emptyReport(year)
  }

  const strengthSessions = sessions.filter(s => s.session_type !== 'cardio')
  const cardioSessions = sessions.filter(s => s.session_type === 'cardio')

  // 2) Aggregates from sessions
  let totalTonnage = 0
  let totalMinutes = 0
  const hourCounts = new Array<number>(24).fill(0)
  const monthly: MonthBucket[] = Array.from({ length: 12 }, (_, m) => ({ month: m, sessions: 0, tonnageKg: 0 }))
  const tonnageByDay = new Map<string, number>()

  for (const s of strengthSessions) {
    const start = new Date(s.started_at)
    const finish = new Date(s.finished_at)
    const dur = Math.max(0, Math.round((finish.getTime() - start.getTime()) / 60000))
    totalMinutes += dur
    totalTonnage += s.total_volume_kg ?? 0
    hourCounts[start.getUTCHours()] += 1
    const m = monthly[start.getUTCMonth()]
    m.sessions += 1
    m.tonnageKg += s.total_volume_kg ?? 0
    const day = s.started_at.slice(0, 10)
    tonnageByDay.set(day, (tonnageByDay.get(day) ?? 0) + (s.total_volume_kg ?? 0))
  }

  // Cardio: count + sum distance
  let cardioKm = 0
  for (const c of cardioSessions) {
    cardioKm += c.cardio_distance_km ?? 0
  }

  // Best day
  let bestDay: WrappedReport['bestDay'] = null
  for (const [day, tonnage] of tonnageByDay.entries()) {
    if (!bestDay || tonnage > bestDay.tonnageKg) {
      bestDay = { date: day, tonnageKg: Math.round(tonnage) }
    }
  }

  // Favorite hour
  let favoriteHour: number | null = null
  let maxHourCount = 0
  hourCounts.forEach((c, i) => {
    if (c > maxHourCount) {
      maxHourCount = c
      favoriteHour = i
    }
  })

  // Longest streak (consecutive calendar days with at least one strength session)
  const uniqueDays = Array.from(new Set(strengthSessions.map(s => s.started_at.slice(0, 10)))).sort()
  let longestStreak = 0
  let current = 0
  let prev: Date | null = null
  for (const day of uniqueDays) {
    const d = new Date(day + 'T00:00:00Z')
    if (prev) {
      const diff = (d.getTime() - prev.getTime()) / 86400000
      current = Math.abs(diff - 1) < 0.5 ? current + 1 : 1
    } else current = 1
    if (current > longestStreak) longestStreak = current
    prev = d
  }

  // 3) Sets aggregates (one query, all sets of the year via session id list)
  const sessionIds = sessions.map(s => s.id)
  let totalSets = 0
  let totalReps = 0
  const setsByMuscle = new Map<string, number>()
  const e1rmByExercise = new Map<string, { e1rm: number; achievedAt: string; name: string; nameRu: string | null }>()

  if (sessionIds.length > 0) {
    // Pull sets in chunks if very large (Supabase row limit ~1000 by default — bump to 10k explicitly)
    const { data: setRows } = await supabase
      .from('set_entries')
      .select('exercise_id, reps, calculated_1rm, created_at, exercises(name, name_ru, primary_muscle)')
      .eq('user_id', userId)
      .in('session_id', sessionIds)
      .limit(10000)

    const rows = (setRows ?? []) as unknown as Array<{
      exercise_id: string
      reps: number
      calculated_1rm: number | null
      created_at: string
      exercises:
        | { name: string; name_ru: string | null; primary_muscle: string | null }
        | { name: string; name_ru: string | null; primary_muscle: string | null }[]
        | null
    }>

    for (const r of rows) {
      totalSets += 1
      totalReps += r.reps
      const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises
      const muscle = ex?.primary_muscle ?? MUSCLE_PRIMARY_FALLBACK
      setsByMuscle.set(muscle, (setsByMuscle.get(muscle) ?? 0) + 1)
      if (r.calculated_1rm != null && ex) {
        const prev = e1rmByExercise.get(r.exercise_id)
        if (!prev || r.calculated_1rm > prev.e1rm) {
          e1rmByExercise.set(r.exercise_id, {
            e1rm: r.calculated_1rm,
            achievedAt: r.created_at,
            name: ex.name,
            nameRu: ex.name_ru,
          })
        }
      }
    }
  }

  // Top muscle (skip unknown)
  let topMuscle: WrappedReport['topMuscle'] = null
  for (const [muscle, sets] of setsByMuscle.entries()) {
    if (muscle === MUSCLE_PRIMARY_FALLBACK) continue
    if (!topMuscle || sets > topMuscle.sets) topMuscle = { muscle, sets }
  }

  // Top PRs: 5 best e1rms across distinct exercises this year
  const topPRs: WrappedTopPR[] = Array.from(e1rmByExercise.values())
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 5)
    .map(p => ({
      exerciseName: p.name,
      exerciseNameRu: p.nameRu,
      e1rm: Math.round(p.e1rm * 10) / 10,
      achievedAt: p.achievedAt,
    }))

  return {
    year,
    hasData: strengthSessions.length > 0 || cardioSessions.length > 0,
    totalSessions: strengthSessions.length,
    totalTonnageKg: Math.round(totalTonnage),
    totalSets,
    totalReps,
    totalMinutes,
    longestStreakDays: longestStreak,
    favoriteHour,
    bestDay,
    topMuscle,
    topPRs,
    monthly,
    cardioKm: Math.round(cardioKm * 10) / 10,
    cardioSessions: cardioSessions.length,
  }
}

function emptyReport(year: number): WrappedReport {
  return {
    year,
    hasData: false,
    totalSessions: 0,
    totalTonnageKg: 0,
    totalSets: 0,
    totalReps: 0,
    totalMinutes: 0,
    longestStreakDays: 0,
    favoriteHour: null,
    bestDay: null,
    topMuscle: null,
    topPRs: [],
    monthly: Array.from({ length: 12 }, (_, m) => ({ month: m, sessions: 0, tonnageKg: 0 })),
    cardioKm: 0,
    cardioSessions: 0,
  }
}
