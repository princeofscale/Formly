import type { StreakInfo } from '@/lib/types/models'

function isoDayOfWeek(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 7 : d
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function longestConsecutiveCalendarDays(dates: string[]): number {
  if (dates.length === 0) return 0
  const set = new Set(dates)
  let longest = 0
  for (const d of dates) {
    const prev = new Date(d + 'T00:00:00Z')
    prev.setUTCDate(prev.getUTCDate() - 1)
    if (set.has(toIso(prev))) continue
    let run = 1
    const cursor = new Date(d + 'T00:00:00Z')
    while (true) {
      cursor.setUTCDate(cursor.getUTCDate() + 1)
      if (set.has(toIso(cursor))) run++
      else break
    }
    longest = Math.max(longest, run)
  }
  return longest
}

export function calculateStreak(
  workoutDates: string[],
  trainingSchedule: number[],
  now: Date = new Date(),
  maxFreezesPerMonth = 0,
): StreakInfo {
  const workoutSet = new Set(workoutDates)
  const lastWorkoutDate = workoutDates[0] ?? null

  if (trainingSchedule.length === 0) {
    return {
      current: 0,
      longest: longestConsecutiveCalendarDays(workoutDates),
      last_workout_date: lastWorkoutDate,
      freezes_per_month: maxFreezesPerMonth,
      freezes_used_this_month: 0,
    }
  }

  const scheduleSet = new Set(trainingSchedule)
  const todayIso = toIso(now)

  const scheduledDays: { iso: string; completed: boolean; isToday: boolean }[] = []
  const cursor = new Date(now)
  cursor.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < 730; i++) {
    const dow = isoDayOfWeek(cursor)
    if (scheduleSet.has(dow)) {
      const iso = toIso(cursor)
      scheduledDays.push({
        iso,
        completed: workoutSet.has(iso),
        isToday: iso === todayIso,
      })
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  // Walk back from today. Missed scheduled days are excused up to
  // maxFreezesPerMonth per calendar month encountered during the walk.
  // Once a month uses up its freezes, the next miss in that month breaks
  // the streak. Today's miss is always tolerated (still trainable).
  const monthKey = (iso: string) => iso.slice(0, 7) // YYYY-MM
  const currentMonthKey = todayIso.slice(0, 7)
  const freezesByMonth = new Map<string, number>()

  let current = 0
  for (const sd of scheduledDays) {
    if (sd.completed) {
      current++
      continue
    }
    if (sd.isToday) continue

    if (maxFreezesPerMonth > 0) {
      const mk = monthKey(sd.iso)
      const usedInMonth = freezesByMonth.get(mk) ?? 0
      if (usedInMonth < maxFreezesPerMonth) {
        freezesByMonth.set(mk, usedInMonth + 1)
        // Frozen day — does NOT add to current count (you didn't actually train),
        // but the streak survives this missed day.
        continue
      }
    }

    break
  }

  const asc = scheduledDays.slice().reverse()
  let longest = 0
  let run = 0
  for (const sd of asc) {
    if (sd.completed) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  return {
    current,
    longest,
    last_workout_date: lastWorkoutDate,
    freezes_per_month: maxFreezesPerMonth,
    freezes_used_this_month: freezesByMonth.get(currentMonthKey) ?? 0,
  }
}
