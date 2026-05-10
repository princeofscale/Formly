# Dashboard & History Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 UX/i18n issues: profile link in dashboard, better Russian stat labels, interactive muscle heatmap with amber gradient, i18n for history pages, workout deletion, and week-based (Mon–Sun) muscle activity calculation.

**Architecture:** All changes are UI/data layer only — no schema migrations. Each task is isolated to 1-3 files. The muscle heatmap gains click-based tooltip state (client component already). The analytics service date calculation is updated server-side. Two new server actions handle delete and locale-aware display.

**Tech Stack:** Next.js App Router (server components + `'use server'` actions), next-intl, react-body-highlighter, Supabase, Tailwind CSS, Lucide icons.

---

## File Map

| File | Change |
|------|--------|
| `messages/ru.json` | Add `history.*` keys, fix `dashboard.week.*` labels |
| `messages/en.json` | Add `history.*` keys, fix `dashboard.week.*` labels |
| `src/app/(app)/dashboard/page.tsx` | Add profile avatar link in header |
| `src/components/dashboard/MuscleHeatmap.tsx` | Amber gradient, frequency encoding, click tooltip, legend |
| `src/lib/services/analytics.service.ts` | Fix week range to Mon–Sun |
| `src/app/(app)/history/page.tsx` | Add i18n |
| `src/app/(app)/history/[sessionId]/page.tsx` | Add i18n + delete button |
| `src/app/(app)/history/actions.ts` | New: `deleteSessionAction` server action |

---

## Task 1: Fix translation strings (ru + en)

**Files:**
- Modify: `messages/ru.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Update `messages/ru.json`**

Replace the `dashboard.week` block and add the `history` namespace:

```json
"dashboard": {
  ...existing keys...,
  "week": {
    "tonnage": "Тоннаж (кг)",
    "sessions": "тренировок",
    "bestE1rm": "Лучший 1ПМ"
  },
  "muscleActivity": "Активность мышц (неделя)",
  ...
},
"history": {
  "title": "История",
  "noWorkouts": "Нет завершённых тренировок.",
  "volume": "кг объём",
  "minutes": "мин",
  "deleteWorkout": "Удалить тренировку",
  "deleteConfirm": "Удалить",
  "deleteCancel": "Отмена",
  "deleteConfirmText": "Удалить тренировку навсегда?",
  "finishedBanner": "Тренировка завершена! Отличная работа 💪",
  "noExercises": "В этой тренировке нет упражнений.",
  "table": {
    "set": "Подход",
    "weight": "Вес",
    "reps": "Повторения",
    "e1rm": "1ПМ",
    "rpe": "RPE"
  },
  "muscleLabel": {
    "chest": "Грудь",
    "back": "Спина",
    "biceps": "Бицепс",
    "triceps": "Трицепс",
    "forearms": "Предплечья",
    "core": "Пресс",
    "quads": "Квадрицепс",
    "hamstrings": "Бицепс бедра",
    "glutes": "Ягодицы",
    "calves": "Икры",
    "traps": "Трапеции",
    "lats": "Широчайшие",
    "rear_delts": "Задние дельты",
    "front_delts": "Передние дельты",
    "side_delts": "Средние дельты"
  },
  "muscleClickHint": "Нажми на мышцу",
  "sets": "подх."
}
```

- [ ] **Step 2: Update `messages/en.json`**

Same structure in English:

```json
"dashboard": {
  ...existing keys...,
  "week": {
    "tonnage": "Tonnage (kg)",
    "sessions": "sessions",
    "bestE1rm": "Best e1RM"
  },
  "muscleActivity": "Muscle Activity (week)",
  ...
},
"history": {
  "title": "History",
  "noWorkouts": "No finished workouts yet.",
  "volume": "kg total",
  "minutes": "min",
  "deleteWorkout": "Delete Workout",
  "deleteConfirm": "Delete",
  "deleteCancel": "Cancel",
  "deleteConfirmText": "Permanently delete this workout?",
  "finishedBanner": "Workout complete! Great work 💪",
  "noExercises": "No exercises logged in this session.",
  "table": {
    "set": "Set",
    "weight": "Weight",
    "reps": "Reps",
    "e1rm": "e1RM",
    "rpe": "RPE"
  },
  "muscleLabel": {
    "chest": "Chest",
    "back": "Back",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "forearms": "Forearms",
    "core": "Core",
    "quads": "Quads",
    "hamstrings": "Hamstrings",
    "glutes": "Glutes",
    "calves": "Calves",
    "traps": "Traps",
    "lats": "Lats",
    "rear_delts": "Rear Delts",
    "front_delts": "Front Delts",
    "side_delts": "Side Delts"
  },
  "muscleClickHint": "Tap a muscle",
  "sets": "sets"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/ru.json messages/en.json
git commit -m "i18n: fix dashboard stat labels, add history namespace"
```

---

## Task 2: Add profile link in dashboard header

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

The profile query already fetches `training_schedule`. Extend it to also fetch `id` (already present), and show an avatar-style link.

- [ ] **Step 1: Add User import and profile avatar link**

In `src/app/(app)/dashboard/page.tsx`, add the `User` icon import at the top:

```tsx
import { Dumbbell, Plus, User } from 'lucide-react'
```

- [ ] **Step 2: Update the header `<div>` in the return**

Replace:
```tsx
<div className="flex items-center justify-between">
  <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>
  <Link
    href="/workout/new"
    className={buttonVariants({ className: 'uppercase tracking-wider font-bold' })}
  >
    <Plus className="h-4 w-4 mr-1" />
    {t('startWorkout')}
  </Link>
</div>
```

With:
```tsx
<div className="flex items-center justify-between">
  <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>
  <div className="flex items-center gap-2">
    <Link
      href="/profile"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-amber-500 transition-colors"
      title={t('profileLink')}
    >
      <User className="h-4 w-4 text-zinc-400" />
    </Link>
    <Link
      href="/workout/new"
      className={buttonVariants({ className: 'uppercase tracking-wider font-bold' })}
    >
      <Plus className="h-4 w-4 mr-1" />
      {t('startWorkout')}
    </Link>
  </div>
</div>
```

- [ ] **Step 3: Add `profileLink` key to both locale files**

In `messages/ru.json` under `"dashboard"`:
```json
"profileLink": "Профиль"
```

In `messages/en.json` under `"dashboard"`:
```json
"profileLink": "Profile"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx messages/ru.json messages/en.json
git commit -m "feat: add profile link to dashboard header"
```

---

## Task 3: Fix muscle activity week range (Monday–Sunday)

**Files:**
- Modify: `src/lib/services/analytics.service.ts`

Currently `getWeeklyMuscleVolume` goes back `weeks * 7` days from today. Change to use current ISO week start (Monday 00:00 local → UTC).

- [ ] **Step 1: Add `getCurrentWeekStart` helper and update `getWeeklyMuscleVolume`**

Replace the `since` calculation in `getWeeklyMuscleVolume`:

```typescript
export async function getWeeklyMuscleVolume(
  supabase: SupabaseClient,
  userId: string,
  _weeks = 1  // kept for signature compatibility, ignored
): Promise<MuscleVolume[]> {
  // Start of current ISO week: Monday 00:00:00 UTC
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const since = new Date(now)
  since.setUTCDate(now.getUTCDate() - daysSinceMonday)
  since.setUTCHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, exercises(primary_muscle, secondary_muscles)')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
  // ... rest unchanged
```

The full updated function:

```typescript
export async function getWeeklyMuscleVolume(
  supabase: SupabaseClient,
  userId: string,
  _weeks = 1
): Promise<MuscleVolume[]> {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const since = new Date(now)
  since.setUTCDate(now.getUTCDate() - daysSinceMonday)
  since.setUTCHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, exercises(primary_muscle, secondary_muscles)')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (!data) return []

  const exerciseMap = new Map<string, { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[]; setCount: number }>()

  for (const row of data) {
    const ex = row.exercises as unknown as { primary_muscle: MuscleGroup; secondary_muscles: MuscleGroup[] } | null
    if (!ex) continue
    const existing = exerciseMap.get(row.exercise_id)
    if (existing) {
      existing.setCount++
    } else {
      exerciseMap.set(row.exercise_id, { ...ex, setCount: 1 })
    }
  }

  const fakeExercises = Array.from(exerciseMap.values()).map(ex => ({
    exercise: { primary_muscle: ex.primary_muscle, secondary_muscles: ex.secondary_muscles } as any,
    sets: Array.from({ length: ex.setCount }, () => ({}) as any),
  }))

  return calculateSessionVolume(fakeExercises)
}
```

- [ ] **Step 2: Update dashboard to remove the manual `since7days` calculation for muscle volume**

In `src/app/(app)/dashboard/page.tsx`, the `since7days` variable is only used for `weekResult` (tonnage/sessions count), not for `muscleVolumes`. No change needed there — the `getWeeklyMuscleVolume` call already has no date arg from the dashboard. Verify the call site:

```tsx
const muscleVolumes = await getWeeklyMuscleVolume(supabase, user.id, 1)
```

This is fine. The `1` arg is now ignored (renamed `_weeks`). No change needed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/analytics.service.ts
git commit -m "fix: muscle activity uses current ISO week (Mon-Sun) instead of rolling 7 days"
```

---

## Task 4: Improve MuscleHeatmap — amber gradient, frequency encoding, click tooltip, legend

**Files:**
- Modify: `src/components/dashboard/MuscleHeatmap.tsx`

The `react-body-highlighter` library supports `frequency` on `IExerciseData` (controls which color index is used) and `onClick` returning `IMuscleStats { muscle, data: { exercises, frequency } }`.

- [ ] **Step 1: Replace full `MuscleHeatmap.tsx` content**

```tsx
'use client'

import { useState } from 'react'
import Model from 'react-body-highlighter'
import type { Muscle, IExerciseData, IMuscleStats } from 'react-body-highlighter'
import type { MuscleVolume } from '@/lib/types/models'

// Amber gradient: light (few sets) → dark (many sets)
const HIGHLIGHT_COLORS = ['#fde68a', '#fbbf24', '#d97706', '#b45309', '#92400e']

const MUSCLE_MAP: Record<string, Muscle> = {
  chest: 'chest',
  back: 'upper-back',
  lats: 'back-deltoids',
  traps: 'trapezius',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  core: 'abs',
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  calves: 'calves',
  front_delts: 'front-deltoids',
  side_delts: 'front-deltoids',
  rear_delts: 'back-deltoids',
}

function setsToFrequency(sets: number): number {
  if (sets <= 2) return 1
  if (sets <= 5) return 2
  if (sets <= 9) return 3
  if (sets <= 14) return 4
  return 5
}

interface Props {
  muscleVolumes: MuscleVolume[]
  muscleLabels: Record<string, string>
  clickHint: string
  setsLabel: string
}

export function MuscleHeatmap({ muscleVolumes, muscleLabels, clickHint, setsLabel }: Props) {
  const [selected, setSelected] = useState<{ name: string; sets: number } | null>(null)

  const activeVolumes = muscleVolumes.filter(mv => mv.total_sets > 0 && MUSCLE_MAP[mv.muscle])

  const data: IExerciseData[] = activeVolumes.map(mv => ({
    name: mv.muscle,
    muscles: [MUSCLE_MAP[mv.muscle]],
    frequency: setsToFrequency(mv.total_sets),
  }))

  const volumeByMuscle = new Map(activeVolumes.map(mv => [mv.muscle, mv.total_sets]))

  function handleClick(stats: IMuscleStats) {
    // Find which of our muscles maps to the clicked body muscle
    const match = activeVolumes.find(mv => MUSCLE_MAP[mv.muscle] === stats.muscle)
    if (!match) return
    setSelected({ name: match.muscle, sets: match.total_sets })
  }

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">{clickHint}</p>
  }

  const topMuscles = [...activeVolumes].sort((a, b) => b.total_sets - a.total_sets).slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="flex justify-center items-start gap-6">
        <Model
          data={data}
          style={{ width: '160px', padding: '5px' }}
          highlightedColors={HIGHLIGHT_COLORS}
          onClick={handleClick}
          bodyColor="#3f3f46"
        />
        <Model
          data={data}
          type="posterior"
          style={{ width: '160px', padding: '5px' }}
          highlightedColors={HIGHLIGHT_COLORS}
          onClick={handleClick}
          bodyColor="#3f3f46"
        />
      </div>

      {/* Click tooltip */}
      <div className="min-h-[32px] flex items-center justify-center">
        {selected ? (
          <div className="flex items-center gap-2 bg-zinc-800 border border-amber-500/40 rounded px-3 py-1.5 text-sm">
            <span className="font-semibold text-amber-400">
              {muscleLabels[selected.name] ?? selected.name}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="font-mono text-white">{selected.sets}</span>
            <span className="text-zinc-400">{setsLabel}</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">{clickHint}</p>
        )}
      </div>

      {/* Muscle legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {topMuscles.map(mv => {
          const freq = setsToFrequency(mv.total_sets)
          const color = HIGHLIGHT_COLORS[freq - 1]
          return (
            <div key={mv.muscle} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-zinc-300">{muscleLabels[mv.muscle] ?? mv.muscle}</span>
              </div>
              <span className="font-mono text-zinc-500">{mv.total_sets}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update dashboard page to pass new props to `MuscleHeatmap`**

In `src/app/(app)/dashboard/page.tsx`, add a second translations call alongside the existing one at the top of the function:

```tsx
const t = await getTranslations('dashboard')
const tHistory = await getTranslations('history')
```

Then update the `MuscleHeatmap` call:

```tsx
<MuscleHeatmap
  muscleVolumes={muscleVolumes}
  muscleLabels={{
    chest: tHistory('muscleLabel.chest'),
    back: tHistory('muscleLabel.back'),
    biceps: tHistory('muscleLabel.biceps'),
    triceps: tHistory('muscleLabel.triceps'),
    forearms: tHistory('muscleLabel.forearms'),
    core: tHistory('muscleLabel.core'),
    quads: tHistory('muscleLabel.quads'),
    hamstrings: tHistory('muscleLabel.hamstrings'),
    glutes: tHistory('muscleLabel.glutes'),
    calves: tHistory('muscleLabel.calves'),
    traps: tHistory('muscleLabel.traps'),
    lats: tHistory('muscleLabel.lats'),
    rear_delts: tHistory('muscleLabel.rear_delts'),
    front_delts: tHistory('muscleLabel.front_delts'),
    side_delts: tHistory('muscleLabel.side_delts'),
  }}
  clickHint={tHistory('muscleClickHint')}
  setsLabel={tHistory('sets')}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/MuscleHeatmap.tsx src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: muscle heatmap — amber gradient, frequency encoding, click tooltip, legend"
```

---

## Task 5: Add workout deletion

**Files:**
- Create: `src/app/(app)/history/actions.ts`
- Modify: `src/app/(app)/history/[sessionId]/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/history/actions.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export async function deleteSessionAction(sessionId: string) {
  const { user } = await verifySession()
  const supabase = await createClient()

  // Verify ownership before deletion
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    throw new Error('Not found')
  }

  await supabase.from('set_entries').delete().eq('session_id', sessionId)
  await supabase.from('workout_sessions').delete().eq('id', sessionId)

  revalidatePath('/history')
  redirect('/history')
}
```

- [ ] **Step 2: Add `DeleteWorkoutButton` inline in the session detail page**

The delete UI needs client state (confirm toggle) but the page is a server component. Use a small `'use client'` inline component. Add it to `src/app/(app)/history/[sessionId]/page.tsx`:

Add imports at top:
```tsx
'use client' // NOT here — page stays server. Add the client component below the page export.
```

Instead, add the client component **at the bottom of the same file** after the page export:

```tsx
// Add above the page function:
import { DeleteWorkoutButton } from './DeleteWorkoutButton'
```

Actually, to keep it clean, create a separate file:

**Create `src/app/(app)/history/[sessionId]/DeleteWorkoutButton.tsx`:**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { deleteSessionAction } from '../actions'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  sessionId: string
  labels: {
    deleteWorkout: string
    deleteConfirmText: string
    deleteConfirm: string
    deleteCancel: string
  }
}

export function DeleteWorkoutButton({ sessionId, labels }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
        <span className="text-sm text-red-400">{labels.deleteConfirmText}</span>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => deleteSessionAction(sessionId))}
        >
          {labels.deleteConfirm}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          {labels.deleteCancel}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {labels.deleteWorkout}
    </Button>
  )
}
```

- [ ] **Step 3: Update session detail page to use translations and add delete button**

Replace full `src/app/(app)/history/[sessionId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslations, getLocale } from 'next-intl/server'
import type { ExerciseWithSets } from '@/lib/types/models'
import { DeleteWorkoutButton } from './DeleteWorkoutButton'

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ finished?: string }>
}) {
  const { sessionId } = await params
  const { finished } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) notFound()

  const sets = await getSetsForSession(supabase, sessionId)
  const allExercises = await getExercises(supabase, user.id)

  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  const exercises = Array.from(exerciseMap.values())
  const date = new Date(session.started_at)
  const duration = session.finished_at
    ? Math.round((new Date(session.finished_at).getTime() - date.getTime()) / 60000)
    : null

  const dateStr = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6">
      {finished === '1' && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-green-400 text-sm font-medium">
          {t('finishedBanner')}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">{dateStr}</h1>
          <p className="text-zinc-400 text-sm">
            {(session.total_volume_kg ?? 0).toFixed(0)} {t('volume')}
            {duration ? ` · ${duration} ${t('minutes')}` : ''}
          </p>
        </div>
        <DeleteWorkoutButton
          sessionId={sessionId}
          labels={{
            deleteWorkout: t('deleteWorkout'),
            deleteConfirmText: t('deleteConfirmText'),
            deleteConfirm: t('deleteConfirm'),
            deleteCancel: t('deleteCancel'),
          }}
        />
      </div>

      {exercises.map(ex => (
        <Card key={ex.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{ex.name}</CardTitle>
            <p className="text-xs text-zinc-500 capitalize">{ex.primary_muscle}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left pb-1">{t('table.set')}</th>
                  <th className="text-left pb-1">{t('table.weight')}</th>
                  <th className="text-left pb-1">{t('table.reps')}</th>
                  <th className="text-left pb-1">{t('table.e1rm')}</th>
                  <th className="text-left pb-1">{t('table.rpe')}</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map(s => (
                  <tr key={s.id} className="border-t border-zinc-800">
                    <td className="py-1 text-zinc-500">#{s.set_number}</td>
                    <td className="py-1">{s.weight_kg}kg</td>
                    <td className="py-1">{s.reps}</td>
                    <td className="py-1 text-zinc-400">{s.calculated_1rm?.toFixed(1) ?? '—'}</td>
                    <td className="py-1 text-zinc-400">{s.rpe ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {exercises.length === 0 && (
        <p className="text-zinc-500 text-center py-8">{t('noExercises')}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/history/actions.ts src/app/\(app\)/history/\[sessionId\]/DeleteWorkoutButton.tsx src/app/\(app\)/history/\[sessionId\]/page.tsx
git commit -m "feat: workout deletion with confirmation + i18n for session detail page"
```

---

## Task 6: i18n for history list page

**Files:**
- Modify: `src/app/(app)/history/page.tsx`

- [ ] **Step 1: Replace full `src/app/(app)/history/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions } from '@/lib/db/workouts'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function HistoryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()

  const sessions = await getRecentSessions(supabase, user.id, 50)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {sessions.length === 0 && (
        <p className="text-zinc-500 text-center py-12">{t('noWorkouts')}</p>
      )}

      {sessions.map(s => {
        const date = new Date(s.started_at)
        const duration = s.finished_at
          ? Math.round((new Date(s.finished_at).getTime() - date.getTime()) / 60000)
          : null

        const dateStr = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })

        return (
          <Link key={s.id} href={`/history/${s.id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{dateStr}</p>
                  <p className="text-xs text-zinc-500">
                    {(s.total_volume_kg ?? 0).toFixed(0)} {t('volume')}
                    {duration ? ` · ${duration} ${t('minutes')}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/history/page.tsx
git commit -m "i18n: history list page — localized dates and labels"
```

---

## Task 7: Deploy and verify

- [ ] **Step 1: Run type check**

```bash
cd /Users/princeofscale/Desktop/Training-Site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
git push origin main
```

Vercel auto-deploys on push. Monitor at https://vercel.com/dashboard or via `vercel logs`.

- [ ] **Step 3: Manual verification checklist**

- [ ] Dashboard header shows profile icon → clicks to `/profile`
- [ ] Weekly stats show "Тоннаж (кг)" / "Лучший 1ПМ" (or EN equivalents)
- [ ] Muscle heatmap is amber-colored, clicking a muscle shows tooltip with set count
- [ ] Muscle legend lists worked muscles with set counts
- [ ] History list shows localized dates ("пн 10 мая" in RU)
- [ ] Session detail shows localized date and labels
- [ ] Session detail has delete button → confirm → deletes → redirects to `/history`
- [ ] Muscle activity uses Monday–Sunday range (check that today if Sunday still shows whole week)
