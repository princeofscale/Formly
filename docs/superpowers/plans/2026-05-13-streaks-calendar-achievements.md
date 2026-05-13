# Calendar + Streaks + Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить пакет фич удержания: 12-недельный календарь-heatmap и стрик тренировок на дашборде + систему достижений с тостами при разблокировке и страницей профиля.

**Architecture:** Стрик и календарь считаются on-the-fly из существующих `workout_sessions` и `set_entries` (без денормализации). Достижения хранятся в новой таблице `achievements`. После каждой завершённой тренировки `finishWorkoutAction` запускает детектор и передаёт коды новых достижений через searchParams для тоста.

**Tech Stack:** Next.js 16 App Router, Supabase + RLS, next-intl v4, Tailwind CSS, Vitest

---

## Файловая карта

| Файл | Действие |
|---|---|
| `messages/en.json` | Добавить `streak.*` + `achievements.*` ключи |
| `messages/ru.json` | То же на русском |
| `supabase/migrations/20260513150000_achievements.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `AchievementCode`, `Achievement`, `StreakInfo`, `DayActivity` |
| `src/lib/db/streak.ts` | Создать |
| `src/lib/db/achievements.ts` | Создать |
| `src/lib/services/streak.service.ts` | Создать |
| `src/lib/services/streak.service.test.ts` | Создать (Vitest) |
| `src/lib/services/achievements.service.ts` | Создать |
| `src/components/dashboard/StreakCard.tsx` | Создать (включая CalendarHeatmap) |
| `src/components/AchievementToast.tsx` | Создать |
| `src/components/profile/AchievementCard.tsx` | Создать |
| `src/app/(app)/profile/achievements/page.tsx` | Создать |
| `src/app/(app)/dashboard/page.tsx` | Изменить — добавить fetch + StreakCard |
| `src/app/(app)/profile/page.tsx` | Изменить — добавить ссылку на achievements |
| `src/app/(app)/workout/[id]/actions.ts` | Изменить — вызвать `detectAndSaveAchievements` |
| `src/app/(app)/history/[sessionId]/page.tsx` | Изменить — рендерить `AchievementToast` |

---

## Task 1: i18n ключи

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Шаг 1: Добавить в `messages/en.json`** (после последней top-level секции, перед `}`):

```json
"streak": {
  "label": "in a row",
  "best": "Best",
  "noWorkouts": "No workouts yet"
},
"achievements": {
  "title": "Achievements",
  "unlocked": "unlocked",
  "achievementsLink": "Achievements",
  "locked": "Locked",
  "received": "received",
  "items": {
    "first_workout":  { "title": "First Step",      "desc": "Complete your first workout",  "condition": "Complete 1 workout" },
    "sessions_10":    { "title": "Getting Started", "desc": "Complete 10 workouts",         "condition": "Complete 10 workouts" },
    "sessions_50":    { "title": "Half Century",    "desc": "Complete 50 workouts",         "condition": "Complete 50 workouts" },
    "sessions_100":   { "title": "Century",         "desc": "Complete 100 workouts",        "condition": "Complete 100 workouts" },
    "tonnage_1000":   { "title": "1 Ton Lifted",    "desc": "Total volume of 1,000 kg",     "condition": "Lift 1,000 kg total" },
    "tonnage_10000":  { "title": "10 Tons",         "desc": "Total volume of 10,000 kg",    "condition": "Lift 10,000 kg total" },
    "tonnage_100000": { "title": "100 Tons Beast",  "desc": "Total volume of 100,000 kg",   "condition": "Lift 100,000 kg total" },
    "streak_7":       { "title": "Week Warrior",    "desc": "7-workout streak",             "condition": "7 workouts in a row" },
    "streak_30":      { "title": "Iron Will",       "desc": "30-workout streak",            "condition": "30 workouts in a row" },
    "first_pr":       { "title": "Record Breaker",  "desc": "Set your first 1RM record",    "condition": "Set a personal record" }
  }
}
```

- [ ] **Шаг 2: Добавить в `messages/ru.json`** (тот же путь):

```json
"streak": {
  "label": "подряд",
  "best": "Лучший",
  "noWorkouts": "Тренировок пока нет"
},
"achievements": {
  "title": "Достижения",
  "unlocked": "разблокировано",
  "achievementsLink": "Достижения",
  "locked": "Заблокировано",
  "received": "получено",
  "items": {
    "first_workout":  { "title": "Первый шаг",         "desc": "Заверши первую тренировку",     "condition": "Заверши 1 тренировку" },
    "sessions_10":    { "title": "Начало пути",        "desc": "Заверши 10 тренировок",         "condition": "Заверши 10 тренировок" },
    "sessions_50":    { "title": "Полсотни",           "desc": "Заверши 50 тренировок",         "condition": "Заверши 50 тренировок" },
    "sessions_100":   { "title": "Сотня",              "desc": "Заверши 100 тренировок",        "condition": "Заверши 100 тренировок" },
    "tonnage_1000":   { "title": "Тонна поднята",      "desc": "Суммарный объём 1 000 кг",      "condition": "Подними 1 000 кг суммарно" },
    "tonnage_10000":  { "title": "10 тонн",            "desc": "Суммарный объём 10 000 кг",     "condition": "Подними 10 000 кг суммарно" },
    "tonnage_100000": { "title": "100 тонн",           "desc": "Суммарный объём 100 000 кг",    "condition": "Подними 100 000 кг суммарно" },
    "streak_7":       { "title": "Неделя силы",        "desc": "Серия из 7 тренировок подряд",  "condition": "7 тренировок подряд" },
    "streak_30":      { "title": "Несокрушимая воля", "desc": "Серия из 30 тренировок подряд", "condition": "30 тренировок подряд" },
    "first_pr":       { "title": "Рекорд!",            "desc": "Установи первый рекорд 1ПМ",    "condition": "Установи личный рекорд" }
  }
}
```

- [ ] **Шаг 3: Проверить JSON**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ru OK')"
```

Expected: `en OK` and `ru OK`.

- [ ] **Шаг 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat: add streak and achievements i18n keys"
```

---

## Task 2: Миграция БД + типы

**Files:**
- Create: `supabase/migrations/20260513150000_achievements.sql`
- Modify: `src/lib/types/models.ts`

- [ ] **Шаг 1: Создать `supabase/migrations/20260513150000_achievements.sql`**

```sql
-- Achievements unlocked per user
create table achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table achievements enable row level security;

create policy "users see own achievements"
  on achievements
  for all
  using (auth.uid() = user_id);
```

- [ ] **Шаг 2: Добавить типы в `src/lib/types/models.ts`** (в конец файла, после существующих типов):

```ts
export type AchievementCode =
  | 'first_workout'
  | 'sessions_10' | 'sessions_50' | 'sessions_100'
  | 'tonnage_1000' | 'tonnage_10000' | 'tonnage_100000'
  | 'streak_7' | 'streak_30'
  | 'first_pr'

export interface Achievement {
  code: AchievementCode
  unlocked_at: string
}

export interface StreakInfo {
  current: number
  longest: number
  last_workout_date: string | null
}

export interface DayActivity {
  date: string  // YYYY-MM-DD
  sets: number
}
```

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Шаг 4: Commit**

```bash
git add supabase/migrations/20260513150000_achievements.sql src/lib/types/models.ts
git commit -m "feat: add achievements table migration and Achievement/Streak types"
```

---

## Task 3: DB функции (streak + achievements)

**Files:**
- Create: `src/lib/db/streak.ts`
- Create: `src/lib/db/achievements.ts`

- [ ] **Шаг 1: Создать `src/lib/db/streak.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DayActivity } from '@/lib/types/models'

export async function getFinishedSessionDates(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
  if (!data) return []
  const dates = new Set<string>()
  for (const row of data) {
    dates.add(row.started_at.slice(0, 10))
  }
  return Array.from(dates)
}

export async function getCalendarActivity(
  supabase: SupabaseClient,
  userId: string,
  days = 84
): Promise<DayActivity[]> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const { data } = await supabase
    .from('set_entries')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const date = row.created_at.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  // Fill all days from `since` to today
  const result: DayActivity[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    result.push({ date: iso, sets: counts.get(iso) ?? 0 })
  }
  return result
}
```

- [ ] **Шаг 2: Создать `src/lib/db/achievements.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Achievement, AchievementCode } from '@/lib/types/models'

export async function getAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('code, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  return (data as Achievement[]) ?? []
}

export async function getUnlockedCodes(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<AchievementCode>> {
  const { data } = await supabase
    .from('achievements')
    .select('code')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.code as AchievementCode))
}

export async function insertAchievements(
  supabase: SupabaseClient,
  userId: string,
  codes: AchievementCode[]
): Promise<Achievement[]> {
  if (codes.length === 0) return []
  const rows = codes.map(code => ({ user_id: userId, code }))
  const { data, error } = await supabase
    .from('achievements')
    .insert(rows)
    .select('code, unlocked_at')
  if (error) throw new Error(error.message)
  return (data as Achievement[]) ?? []
}
```

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 4: Commit**

```bash
git add src/lib/db/streak.ts src/lib/db/achievements.ts
git commit -m "feat: add DB functions for streak and achievements"
```

---

## Task 4: Streak сервис с TDD

**Files:**
- Create: `src/lib/services/streak.service.ts`
- Create: `src/lib/services/streak.service.test.ts`

- [ ] **Шаг 1: Сначала тесты — создать `src/lib/services/streak.service.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { calculateStreak } from './streak.service'

describe('calculateStreak', () => {
  it('returns zero streak for empty workout history', () => {
    const result = calculateStreak([], [1, 3, 5], new Date('2026-05-13T12:00:00Z'))
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
    expect(result.last_workout_date).toBeNull()
  })

  it('counts consecutive scheduled workout days', () => {
    // Schedule: Mon/Wed/Fri = [1, 3, 5]
    // 2026-05-13 = Wednesday
    // Workouts: Mon 11, Wed 13 (today)
    const result = calculateStreak(
      ['2026-05-13', '2026-05-11'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.current).toBe(2)
    expect(result.last_workout_date).toBe('2026-05-13')
  })

  it('ignores rest days when counting streak', () => {
    // Schedule: Mon/Wed/Fri. Tuesday workout doesn't count, Wed missing → streak break only at Wed
    // 2026-05-13 = Wed (today, no workout yet — allowed)
    // Workouts on Mon 11, Tue 12 (off-schedule)
    const result = calculateStreak(
      ['2026-05-12', '2026-05-11'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    // Mon completed; Wed is today and not done — skip; current = 1 (Mon)
    expect(result.current).toBe(1)
  })

  it('breaks streak when a scheduled day was missed', () => {
    // Schedule: Mon/Wed/Fri. Wed 06 missing, Mon 04 and Fri 01 done.
    // Today is Mon 11 with workout. Wed 13 not yet.
    // Walk back from today (Mon 11): Mon 11 ✓, Fri 08 missing → break.
    const result = calculateStreak(
      ['2026-05-11', '2026-05-04', '2026-05-01'],
      [1, 3, 5],
      new Date('2026-05-11T12:00:00Z')
    )
    expect(result.current).toBe(1)
  })

  it('treats today as allowed even if scheduled and no workout', () => {
    // Today is Mon 11 (scheduled), no workout yet. Fri 08 workout was completed.
    // Walk back: Mon 11 today — skip (not yet over); Fri 08 ✓; Wed 06 ?
    const result = calculateStreak(
      ['2026-05-08', '2026-05-06', '2026-05-04'],
      [1, 3, 5],
      new Date('2026-05-11T08:00:00Z')
    )
    expect(result.current).toBe(3)
  })

  it('computes longest streak from history', () => {
    // Schedule: Mon/Wed/Fri. Workouts: Apr 22 (Wed), Apr 24 (Fri), Apr 27 (Mon), Apr 29 (Wed). 4 in a row.
    // Then nothing until May 11 (Mon), May 13 (Wed). 2 in a row.
    const result = calculateStreak(
      ['2026-05-13', '2026-05-11', '2026-04-29', '2026-04-27', '2026-04-24', '2026-04-22'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.longest).toBe(4)
    expect(result.current).toBe(2)
  })

  it('falls back to consecutive calendar days when no schedule', () => {
    // No schedule. current must be 0 (can't track without schedule).
    // longest: count longest run of consecutive YYYY-MM-DD.
    const result = calculateStreak(
      ['2026-05-13', '2026-05-12', '2026-05-11', '2026-05-09'],
      [],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.current).toBe(0)
    expect(result.longest).toBe(3)
  })
})
```

- [ ] **Шаг 2: Запустить тесты — убедиться что они падают**

```bash
npx vitest run src/lib/services/streak.service.test.ts 2>&1 | tail -20
```

Expected: FAIL (модуль не существует).

- [ ] **Шаг 3: Создать `src/lib/services/streak.service.ts`**

```ts
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
    // Only start counting if previous day is not in set (start of a run)
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
  now: Date = new Date()
): StreakInfo {
  const workoutSet = new Set(workoutDates)
  const lastWorkoutDate = workoutDates[0] ?? null

  if (trainingSchedule.length === 0) {
    return {
      current: 0,
      longest: longestConsecutiveCalendarDays(workoutDates),
      last_workout_date: lastWorkoutDate,
    }
  }

  const scheduleSet = new Set(trainingSchedule)
  const todayIso = toIso(now)

  // Walk back ~2 years collecting scheduled training days
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

  // scheduledDays is newest first. Compute current by walking from start.
  let current = 0
  for (const sd of scheduledDays) {
    if (sd.completed) {
      current++
      continue
    }
    if (sd.isToday) continue
    break
  }

  // Longest: reverse to ASC and find longest run of completed=true
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
  }
}
```

- [ ] **Шаг 4: Запустить тесты — должны пройти**

```bash
npx vitest run src/lib/services/streak.service.test.ts 2>&1 | tail -20
```

Expected: 7 passed.

- [ ] **Шаг 5: Commit**

```bash
git add src/lib/services/streak.service.ts src/lib/services/streak.service.test.ts
git commit -m "feat: add calculateStreak service with schedule-based logic and unit tests"
```

---

## Task 5: Achievements сервис

**Files:**
- Create: `src/lib/services/achievements.service.ts`

- [ ] **Шаг 1: Создать `src/lib/services/achievements.service.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Achievement, AchievementCode } from '@/lib/types/models'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { getUnlockedCodes, insertAchievements } from '@/lib/db/achievements'
import { calculateStreak } from './streak.service'

export interface AchievementMeta {
  icon: string
  category: 'sessions' | 'tonnage' | 'streak' | 'pr'
}

export const ACHIEVEMENT_META: Record<AchievementCode, AchievementMeta> = {
  first_workout:  { icon: '🎯', category: 'sessions' },
  sessions_10:    { icon: '💪', category: 'sessions' },
  sessions_50:    { icon: '🔥', category: 'sessions' },
  sessions_100:   { icon: '👑', category: 'sessions' },
  tonnage_1000:   { icon: '🏋', category: 'tonnage' },
  tonnage_10000:  { icon: '⚡', category: 'tonnage' },
  tonnage_100000: { icon: '🚀', category: 'tonnage' },
  streak_7:       { icon: '🔥', category: 'streak' },
  streak_30:      { icon: '⚡', category: 'streak' },
  first_pr:       { icon: '🏆', category: 'pr' },
}

export const ALL_ACHIEVEMENT_CODES: AchievementCode[] = Object.keys(ACHIEVEMENT_META) as AchievementCode[]

interface UserStats {
  totalSessions: number
  totalTonnage: number
  currentStreak: number
  hasPR: boolean
}

function evaluateRules(stats: UserStats): AchievementCode[] {
  const earned: AchievementCode[] = []
  if (stats.totalSessions >= 1) earned.push('first_workout')
  if (stats.totalSessions >= 10) earned.push('sessions_10')
  if (stats.totalSessions >= 50) earned.push('sessions_50')
  if (stats.totalSessions >= 100) earned.push('sessions_100')
  if (stats.totalTonnage >= 1000) earned.push('tonnage_1000')
  if (stats.totalTonnage >= 10000) earned.push('tonnage_10000')
  if (stats.totalTonnage >= 100000) earned.push('tonnage_100000')
  if (stats.currentStreak >= 7) earned.push('streak_7')
  if (stats.currentStreak >= 30) earned.push('streak_30')
  if (stats.hasPR) earned.push('first_pr')
  return earned
}

export async function detectAndSaveAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  const [sessionsResult, profileResult, prCountResult, workoutDates] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('total_volume_kg', { count: 'exact' })
      .eq('user_id', userId)
      .not('finished_at', 'is', null),
    supabase
      .from('profiles')
      .select('training_schedule')
      .eq('id', userId)
      .single(),
    supabase
      .from('set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('calculated_1rm', 'is', null),
    getFinishedSessionDates(supabase, userId),
  ])

  const totalSessions = sessionsResult.count ?? 0
  const totalTonnage = (sessionsResult.data ?? []).reduce(
    (sum, r) => sum + (r.total_volume_kg ?? 0),
    0
  )
  const hasPR = (prCountResult.count ?? 0) > 0
  const schedule = profileResult.data?.training_schedule ?? []

  const streak = calculateStreak(workoutDates, schedule)

  const eligible = evaluateRules({
    totalSessions,
    totalTonnage,
    currentStreak: streak.current,
    hasPR,
  })

  const unlocked = await getUnlockedCodes(supabase, userId)
  const newCodes = eligible.filter(c => !unlocked.has(c))

  return insertAchievements(supabase, userId, newCodes)
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/lib/services/achievements.service.ts
git commit -m "feat: add achievements service with detection logic"
```

---

## Task 6: StreakCard компонент с календарём

**Files:**
- Create: `src/components/dashboard/StreakCard.tsx`

- [ ] **Шаг 1: Создать `src/components/dashboard/StreakCard.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { StreakInfo, DayActivity } from '@/lib/types/models'

function cellColor(sets: number): string {
  if (sets === 0) return 'bg-white/5'
  if (sets <= 5) return 'bg-amber-500/30'
  if (sets <= 15) return 'bg-amber-500/60'
  return 'bg-amber-500'
}

interface HeatmapProps {
  activity: DayActivity[]
  setsLabel: string
}

function CalendarHeatmap({ activity, setsLabel }: HeatmapProps) {
  const todayIso = new Date().toISOString().slice(0, 10)

  // Group into 12 weeks. activity[0] is oldest, activity[83] is today.
  // We want columns = weeks (left = oldest), rows = days (Mon=0..Sun=6).
  // Activity is in chronological ASC order. Determine each day's column and row.
  const cells: (DayActivity & { col: number; row: number })[] = activity.map((d, i) => {
    const date = new Date(d.date + 'T00:00:00Z')
    const dow = date.getUTCDay()
    const row = dow === 0 ? 6 : dow - 1  // Mon=0, Sun=6
    const col = Math.floor(i / 7)
    return { ...d, col, row }
  })

  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 12 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, row) => {
            const cell = cells.find(c => c.col === col && c.row === row)
            if (!cell) return <div key={row} className="aspect-square" />
            const isToday = cell.date === todayIso
            return (
              <div
                key={row}
                title={`${cell.date} · ${cell.sets} ${setsLabel}`}
                className={`aspect-square rounded-sm ${cellColor(cell.sets)} ${
                  isToday ? 'ring-1 ring-amber-500/70' : ''
                }`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface Props {
  streak: StreakInfo
  activity: DayActivity[]
}

export function StreakCard({ streak, activity }: Props) {
  const t = useTranslations('streak')
  const th = useTranslations('history')

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-7 w-7 text-orange-400" />
            <div>
              <div className="text-4xl font-black text-amber-500 leading-none tabular-nums">
                {streak.current}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                {t('label')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{t('best')}</div>
            <div className="text-sm font-bold text-zinc-300 tabular-nums">{streak.longest}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CalendarHeatmap activity={activity} setsLabel={th('sets')} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/dashboard/StreakCard.tsx
git commit -m "feat: add StreakCard with 12-week heatmap and streak counter"
```

---

## Task 7: Интеграция в Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Шаг 1: Прочитать текущий `dashboard/page.tsx`** чтобы понять структуру

```bash
cat "src/app/(app)/dashboard/page.tsx" | head -60
```

- [ ] **Шаг 2: Добавить импорты в верх `dashboard/page.tsx`**

```ts
import { getFinishedSessionDates, getCalendarActivity } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import { StreakCard } from '@/components/dashboard/StreakCard'
```

- [ ] **Шаг 3: Расширить `Promise.all` двумя запросами**

Найти `const [sessionsResult, profileResult, weekResult, prResult, initialInsights] = await Promise.all([` и добавить 2 элемента в конец массива (перед закрывающей `])`):

```ts
  getFinishedSessionDates(supabase, user.id),
  getCalendarActivity(supabase, user.id),
])
```

И обновить destructuring:
```ts
const [sessionsResult, profileResult, weekResult, prResult, initialInsights, workoutDates, calendarActivity] = await Promise.all([
```

- [ ] **Шаг 4: Вычислить стрик после Promise.all**

После строки получения данных профиля (там где уже извлекается `schedule`), добавить:

```ts
const streakInfo = calculateStreak(workoutDates, schedule)
```

- [ ] **Шаг 5: Добавить `<StreakCard>` в JSX**

Найти `<WeeklyStats ... />` и добавить **до** него (чтобы стрик показывался первым после CTA):

```tsx
<StreakCard streak={streakInfo} activity={calendarActivity} />
```

- [ ] **Шаг 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 7: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: integrate StreakCard with heatmap into dashboard"
```

---

## Task 8: Интеграция в finishWorkoutAction

**Files:**
- Modify: `src/app/(app)/workout/[id]/actions.ts`

- [ ] **Шаг 1: Прочитать текущий `finishWorkoutAction`**

```bash
cat "src/app/(app)/workout/[id]/actions.ts" | tail -30
```

- [ ] **Шаг 2: Добавить импорт в `src/app/(app)/workout/[id]/actions.ts`**

После существующих импортов:

```ts
import { detectAndSaveAchievements } from '@/lib/services/achievements.service'
```

- [ ] **Шаг 3: Заменить `finishWorkoutAction` целиком**

Найти существующую функцию и заменить на:

```ts
export async function finishWorkoutAction(sessionId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  const newAchievements = await detectAndSaveAchievements(supabase, user.id)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  const codes = newAchievements.map(a => a.code).join(',')
  const suffix = codes ? '?finished=1&unlocked=' + encodeURIComponent(codes) : '?finished=1'
  redirect('/history/' + sessionId + suffix)
}
```

- [ ] **Шаг 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 5: Commit**

```bash
git add src/app/\(app\)/workout/\[id\]/actions.ts
git commit -m "feat: detect and persist achievements on workout finish"
```

---

## Task 9: AchievementToast + history integration

**Files:**
- Create: `src/components/AchievementToast.tsx`
- Modify: `src/app/(app)/history/[sessionId]/page.tsx`

- [ ] **Шаг 1: Создать `src/components/AchievementToast.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ACHIEVEMENT_META } from '@/lib/services/achievements.service'
import type { AchievementCode } from '@/lib/types/models'

interface Props {
  codes: AchievementCode[]
}

export function AchievementToast({ codes }: Props) {
  const t = useTranslations('achievements.items')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(id)
  }, [])

  if (!visible || codes.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
      {codes.map((code, i) => {
        const meta = ACHIEVEMENT_META[code]
        if (!meta) return null
        return (
          <div
            key={code}
            className="flex items-center gap-3 p-3 rounded-xl animate-in slide-in-from-right-4 fade-in zoom-in-95 duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(139,92,246,0.18))',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(245,158,11,0.4)',
              animationDelay: `${i * 200}ms`,
            }}
          >
            <div className="text-3xl flex-shrink-0">{meta.icon}</div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
                ✦ Achievement
              </div>
              <div className="text-sm font-bold text-white truncate">{t(`${code}.title`)}</div>
              <div className="text-[10px] text-zinc-400 truncate">{t(`${code}.desc`)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Шаг 2: Прочитать `src/app/(app)/history/[sessionId]/page.tsx`**

```bash
cat "src/app/(app)/history/[sessionId]/page.tsx" | head -25
```

- [ ] **Шаг 3: Изменить `history/[sessionId]/page.tsx` чтобы парсить `unlocked` и рендерить тост**

Изменить тип `searchParams` (добавить поле `unlocked`):

```ts
searchParams: Promise<{ finished?: string; unlocked?: string }>
```

В деструктуризации (где уже извлекается `finished`):

```ts
const { finished, unlocked } = await searchParams
```

Добавить импорт в начало файла:

```ts
import { AchievementToast } from '@/components/AchievementToast'
import type { AchievementCode } from '@/lib/types/models'
```

В JSX (где-нибудь в конец вернаемого рендера, перед закрывающим тегом основного div):

```tsx
{unlocked && (
  <AchievementToast codes={unlocked.split(',') as AchievementCode[]} />
)}
```

- [ ] **Шаг 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 5: Commit**

```bash
git add src/components/AchievementToast.tsx src/app/\(app\)/history/\[sessionId\]/page.tsx
git commit -m "feat: show AchievementToast after workout when new achievements unlocked"
```

---

## Task 10: Страница достижений + ссылка из профиля

**Files:**
- Create: `src/components/profile/AchievementCard.tsx`
- Create: `src/app/(app)/profile/achievements/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`

- [ ] **Шаг 1: Создать `src/components/profile/AchievementCard.tsx`**

```tsx
'use client'

import { Lock } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { ACHIEVEMENT_META } from '@/lib/services/achievements.service'
import type { AchievementCode } from '@/lib/types/models'

const CATEGORY_BORDER: Record<string, string> = {
  sessions: '#a78bfa',
  tonnage:  '#f59e0b',
  streak:   '#f87171',
  pr:       '#4ade80',
}

interface Props {
  code: AchievementCode
  unlockedAt: string | null
}

export function AchievementCard({ code, unlockedAt }: Props) {
  const t = useTranslations('achievements')
  const locale = useLocale()
  const meta = ACHIEVEMENT_META[code]
  const isUnlocked = unlockedAt !== null

  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
        day: 'numeric',
        month: 'long',
      })
    : null

  return (
    <div
      className={`p-4 rounded-xl transition-opacity ${isUnlocked ? '' : 'opacity-40'}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isUnlocked ? CATEGORY_BORDER[meta.category] + '60' : 'rgba(255,255,255,0.10)'}`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-3xl">{meta.icon}</div>
        {!isUnlocked && <Lock className="h-4 w-4 text-zinc-500" />}
      </div>
      <div className="text-sm font-bold text-white">{t(`items.${code}.title`)}</div>
      <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
        {isUnlocked ? t(`items.${code}.desc`) : t(`items.${code}.condition`)}
      </div>
      {dateStr && (
        <div className="text-[9px] text-zinc-600 mt-2 uppercase tracking-wide">
          {t('received')} {dateStr}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Шаг 2: Создать `src/app/(app)/profile/achievements/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { Trophy } from 'lucide-react'
import { getAchievements } from '@/lib/db/achievements'
import { ALL_ACHIEVEMENT_CODES } from '@/lib/services/achievements.service'
import { AchievementCard } from '@/components/profile/AchievementCard'

export default async function AchievementsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('achievements')

  const unlocked = await getAchievements(supabase, user.id)
  const unlockedMap = new Map(unlocked.map(a => [a.code, a.unlocked_at]))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Trophy className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
          <p className="text-sm text-zinc-500">
            {unlocked.length} / {ALL_ACHIEVEMENT_CODES.length} {t('unlocked')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
        {ALL_ACHIEVEMENT_CODES.map(code => (
          <AchievementCard
            key={code}
            code={code}
            unlockedAt={unlockedMap.get(code) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 3: Добавить ссылку на странице профиля**

Прочитать `src/app/(app)/profile/page.tsx`:

```bash
cat "src/app/(app)/profile/page.tsx" | head -50
```

Добавить импорты (если их ещё нет):

```ts
import Link from 'next/link'
import { Trophy, ChevronRight } from 'lucide-react'
import { getAchievements } from '@/lib/db/achievements'
import { ALL_ACHIEVEMENT_CODES } from '@/lib/services/achievements.service'
```

В серверном компоненте, рядом с другими запросами, добавить:

```ts
const unlockedAchievements = await getAchievements(supabase, user.id)
const unlockedCount = unlockedAchievements.length
```

В JSX добавить ссылку (где-нибудь в основной части страницы, до блока выхода/удаления):

```tsx
<Link
  href="/profile/achievements"
  className="flex items-center justify-between p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
>
  <div className="flex items-center gap-3">
    <Trophy className="h-5 w-5 text-amber-500" />
    <div>
      <div className="font-bold text-sm">{tAch('achievementsLink')}</div>
      <div className="text-xs text-zinc-500">
        {unlockedCount} / {ALL_ACHIEVEMENT_CODES.length}
      </div>
    </div>
  </div>
  <ChevronRight className="h-4 w-4 text-zinc-500" />
</Link>
```

И добавить `const tAch = await getTranslations('achievements')` рядом с существующими `getTranslations`.

- [ ] **Шаг 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 5: Commit**

```bash
git add src/components/profile/AchievementCard.tsx src/app/\(app\)/profile/achievements/page.tsx src/app/\(app\)/profile/page.tsx
git commit -m "feat: add achievements page with grid view and profile link"
```

---

## Task 11: Финальная проверка и push

- [ ] **Шаг 1: Полный TypeScript check**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Шаг 2: Все Vitest тесты**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: все тесты passed, в том числе 7 для `calculateStreak`.

- [ ] **Шаг 3: Сборка Next.js**

```bash
npx next build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`.

- [ ] **Шаг 4: Push**

```bash
git push origin main
```

---

## Чеклист готовности

- [ ] i18n ключи `streak.*` и `achievements.*` в обоих файлах
- [ ] Таблица `achievements` создана с RLS
- [ ] Типы `Achievement`, `AchievementCode`, `StreakInfo`, `DayActivity` в `models.ts`
- [ ] `getFinishedSessionDates`, `getCalendarActivity` в `db/streak.ts`
- [ ] `getAchievements`, `getUnlockedCodes`, `insertAchievements` в `db/achievements.ts`
- [ ] `calculateStreak` с 7 unit-тестами проходящими
- [ ] `detectAndSaveAchievements` корректно агрегирует и фильтрует
- [ ] `StreakCard` рендерит heatmap 12 недель + стрик-блок
- [ ] Dashboard показывает `StreakCard` после CTA
- [ ] `finishWorkoutAction` вызывает детектор и передаёт коды через searchParams
- [ ] `AchievementToast` показывает разблокированные на странице истории
- [ ] Страница `/profile/achievements` рендерит сетку всех 10 достижений
- [ ] Ссылка с `/profile` на страницу достижений работает
- [ ] TypeScript: 0 ошибок, build: успешный
