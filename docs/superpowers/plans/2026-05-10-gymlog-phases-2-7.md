# GymLog Phases 2–7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all remaining GymLog features — active workout logging, exercise library, history, analytics, and profile.

**Architecture:** Server Components for data loading; Client Components for interactive UI; Server Actions for mutations. Pure utility functions are unit-tested; Supabase-query services are integration-tested at runtime only (per project spec).

**Tech Stack:** Next.js 16.2.6 (params is a `Promise` — always `await params`), React 19, Supabase SSR, Tailwind v4, shadcn/ui, Recharts, react-body-highlighter 2.0.5, Zod 4, Vitest

**CRITICAL Next.js 16 convention:** Dynamic route `params` and `searchParams` are Promises.
```tsx
// CORRECT in Next.js 16
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

## File Map

**Create:**
```
src/lib/db/exercises.ts
src/lib/db/workouts.ts
src/lib/db/sets.ts
src/lib/services/pr.service.ts
src/lib/services/pr.service.test.ts
src/lib/services/progression.service.ts
src/lib/services/progression.service.test.ts
src/lib/services/analytics.service.ts
src/lib/utils/plate-calculator.ts
src/lib/utils/plate-calculator.test.ts
src/app/(app)/workout/new/page.tsx
src/app/(app)/workout/new/actions.ts
src/app/(app)/workout/[id]/page.tsx
src/app/(app)/workout/[id]/actions.ts
src/app/(app)/workout/[id]/loading.tsx
src/app/(app)/history/page.tsx
src/app/(app)/history/[sessionId]/page.tsx
src/app/(app)/exercise-library/page.tsx
src/app/(app)/exercise-library/actions.ts
src/app/(app)/analytics/page.tsx
src/app/(app)/profile/page.tsx
src/app/(app)/profile/actions.ts
src/components/workout/WorkoutClient.tsx
src/components/workout/ExerciseSearch.tsx
src/components/workout/ExerciseBlock.tsx
src/components/workout/SetRow.tsx
src/components/workout/RestTimer.tsx
src/components/workout/PlateCalculator.tsx
src/components/workout/LastTimeHint.tsx
src/components/workout/PRBadge.tsx
src/components/workout/FinishWorkoutButton.tsx
src/components/analytics/ProgressChart.tsx
src/components/analytics/TonnageChart.tsx
src/components/analytics/VolumeLandmarks.tsx
src/components/dashboard/MuscleHeatmap.tsx
src/components/dashboard/ScheduleStatus.tsx
src/components/exercise/ExerciseForm.tsx
```

**Modify:**
```
src/app/(app)/dashboard/page.tsx   — add schedule status, heatmap, muscles per session
src/lib/types/models.ts            — add ProgressionSuggestion, VolumeLandmark, ExerciseWithSets
```

---

## Task 1: Extend Types

**Files:**
- Modify: `src/lib/types/models.ts`

- [ ] **Step 1: Add new types**

```typescript
// append to src/lib/types/models.ts

export interface ExerciseWithSets extends Exercise {
  sets: SetEntry[]
}

export interface ProgressionSuggestion {
  exercise_id: string
  exercise_name: string
  current_weight_kg: number
  suggested_weight_kg: number
  reason: string
}

export interface VolumeLandmark {
  muscle: MuscleGroup
  weekly_sets: number
  status: 'mv' | 'optimal' | 'mrv'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/models.ts
git commit -m "feat: add ExerciseWithSets, ProgressionSuggestion, VolumeLandmark types"
```

---

## Task 2: Exercise Repository

**Files:**
- Create: `src/lib/db/exercises.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/db/exercises.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Exercise, MuscleGroup, Equipment } from '@/lib/types/models'

export async function getExercises(
  supabase: SupabaseClient,
  userId: string,
  filters?: { muscle?: MuscleGroup; equipment?: Equipment }
): Promise<Exercise[]> {
  let query = supabase
    .from('exercises')
    .select('*')
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name')

  if (filters?.muscle) query = query.eq('primary_muscle', filters.muscle)
  if (filters?.equipment) query = query.eq('equipment', filters.equipment)

  const { data } = await query
  return (data as Exercise[]) ?? []
}

export async function searchExercises(
  supabase: SupabaseClient,
  userId: string,
  query: string
): Promise<Exercise[]> {
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name')
    .limit(20)
  return (data as Exercise[]) ?? []
}

export async function createExercise(
  supabase: SupabaseClient,
  userId: string,
  data: Omit<Exercise, 'id' | 'is_custom' | 'created_by'>
): Promise<Exercise> {
  const { data: ex, error } = await supabase
    .from('exercises')
    .insert({ ...data, is_custom: true, created_by: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return ex as Exercise
}

export async function updateExercise(
  supabase: SupabaseClient,
  id: string,
  data: Partial<Omit<Exercise, 'id' | 'is_custom' | 'created_by'>>
): Promise<void> {
  const { error } = await supabase.from('exercises').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExercise(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/exercises.ts
git commit -m "feat: add exercise repository"
```

---

## Task 3: Workout + Set Repositories

**Files:**
- Create: `src/lib/db/workouts.ts`
- Create: `src/lib/db/sets.ts`

- [ ] **Step 1: Write workouts.ts**

```typescript
// src/lib/db/workouts.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutSession } from '@/lib/types/models'

export async function createSession(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, started_at: new Date().toISOString(), total_volume_kg: 0 })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as WorkoutSession
}

export async function getSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  return data as WorkoutSession | null
}

export async function getRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<WorkoutSession[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data as WorkoutSession[]) ?? []
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as WorkoutSession | null
}

export async function finishSession(
  supabase: SupabaseClient,
  sessionId: string,
  totalVolumeKg: number
): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ finished_at: new Date().toISOString(), total_volume_kg: totalVolumeKg })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Write sets.ts**

```typescript
// src/lib/db/sets.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SetEntry } from '@/lib/types/models'

export async function addSet(
  supabase: SupabaseClient,
  data: {
    sessionId: string
    userId: string
    exerciseId: string
    setNumber: number
    weightKg: number
    reps: number
    rpe?: number
    calculated1rm: number
  }
): Promise<SetEntry> {
  const { data: set, error } = await supabase
    .from('set_entries')
    .insert({
      session_id: data.sessionId,
      user_id: data.userId,
      exercise_id: data.exerciseId,
      set_number: data.setNumber,
      weight_kg: data.weightKg,
      reps: data.reps,
      rpe: data.rpe ?? null,
      calculated_1rm: data.calculated1rm,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return set as SetEntry
}

export async function getSetsForSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<SetEntry[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at')
  return (data as SetEntry[]) ?? []
}

export async function getLastSetsForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  currentSessionId: string
): Promise<SetEntry[]> {
  // Find the most recent finished session that has sets for this exercise
  const { data: prevSets } = await supabase
    .from('set_entries')
    .select('*, workout_sessions!inner(finished_at)')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', currentSessionId)
    .not('workout_sessions.finished_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!prevSets || prevSets.length === 0) return []

  // Return sets from the most recent session only
  const lastSessionId = prevSets[0].session_id
  return prevSets.filter(s => s.session_id === lastSessionId) as SetEntry[]
}

export async function getBestE1RMForExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  excludeSetId?: string
): Promise<number | null> {
  let query = supabase
    .from('set_entries')
    .select('calculated_1rm')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .not('calculated_1rm', 'is', null)
    .order('calculated_1rm', { ascending: false })
    .limit(1)

  if (excludeSetId) query = query.neq('id', excludeSetId)

  const { data } = await query.maybeSingle()
  return data?.calculated_1rm ?? null
}

export async function getE1RMHistory(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string
): Promise<{ date: string; e1rm: number }[]> {
  const { data } = await supabase
    .from('set_entries')
    .select('created_at, calculated_1rm')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .not('calculated_1rm', 'is', null)
    .order('created_at')

  if (!data) return []

  // Keep only daily max e1RM
  const byDay = new Map<string, number>()
  for (const row of data) {
    const day = row.created_at.slice(0, 10)
    const current = byDay.get(day) ?? 0
    if (row.calculated_1rm > current) byDay.set(day, row.calculated_1rm)
  }

  return Array.from(byDay.entries()).map(([date, e1rm]) => ({ date, e1rm }))
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/workouts.ts src/lib/db/sets.ts
git commit -m "feat: add workout and set repositories"
```

---

## Task 4: PR Service + Tests

**Files:**
- Create: `src/lib/services/pr.service.ts`
- Create: `src/lib/services/pr.service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/services/pr.service.test.ts
import { describe, it, expect } from 'vitest'
import { detectPRFromHistory } from './pr.service'

describe('detectPRFromHistory', () => {
  it('returns is_pr=true when current > historical best', () => {
    const result = detectPRFromHistory(150, 140)
    expect(result.is_pr).toBe(true)
    expect(result.previous_1rm).toBe(140)
    expect(result.current_1rm).toBe(150)
    expect(result.improvement_pct).toBeCloseTo(7.14, 1)
  })

  it('returns is_pr=false when current <= historical best', () => {
    const result = detectPRFromHistory(130, 140)
    expect(result.is_pr).toBe(false)
  })

  it('returns is_pr=true when no history exists', () => {
    const result = detectPRFromHistory(100, null)
    expect(result.is_pr).toBe(true)
    expect(result.previous_1rm).toBeNull()
  })

  it('returns is_pr=false when equal to historical best', () => {
    const result = detectPRFromHistory(140, 140)
    expect(result.is_pr).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd TrainingAR && npm test -- pr.service
```
Expected: FAIL with "detectPRFromHistory is not a function"

- [ ] **Step 3: Implement pr.service.ts**

```typescript
// src/lib/services/pr.service.ts
import type { PRResult } from '@/lib/types/models'

export function detectPRFromHistory(
  currentE1rm: number,
  previousBestE1rm: number | null
): PRResult {
  if (previousBestE1rm === null) {
    return { is_pr: true, previous_1rm: null, current_1rm: currentE1rm, improvement_pct: null }
  }

  if (currentE1rm > previousBestE1rm) {
    const improvement_pct = ((currentE1rm - previousBestE1rm) / previousBestE1rm) * 100
    return { is_pr: true, previous_1rm: previousBestE1rm, current_1rm: currentE1rm, improvement_pct }
  }

  return { is_pr: false, previous_1rm: previousBestE1rm, current_1rm: currentE1rm, improvement_pct: null }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- pr.service
```
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/pr.service.ts src/lib/services/pr.service.test.ts
git commit -m "feat: add PR detection service with tests"
```

---

## Task 5: Progression Service + Tests

**Files:**
- Create: `src/lib/services/progression.service.ts`
- Create: `src/lib/services/progression.service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/services/progression.service.test.ts
import { describe, it, expect } from 'vitest'
import { getProgressionSuggestion } from './progression.service'
import type { SetEntry } from '@/lib/types/models'

function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: '1', session_id: 's1', user_id: 'u1', exercise_id: 'e1',
    set_number: 1, weight_kg: 80, reps: 10, rpe: null,
    calculated_1rm: null, rest_seconds: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getProgressionSuggestion', () => {
  it('suggests weight increase when all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 12 }), makeSet({ reps: 12 })]
    const result = getProgressionSuggestion(sets, 80, 8, 12)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(82.5, 0)
  })

  it('returns null when not all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 10 }), makeSet({ reps: 8 })]
    const result = getProgressionSuggestion(sets, 80, 8, 12)
    expect(result).toBeNull()
  })

  it('returns null for empty sets', () => {
    expect(getProgressionSuggestion([], 80, 8, 12)).toBeNull()
  })

  it('suggests 5kg increase for heavy lifts (>= 100kg)', () => {
    const sets = [makeSet({ weight_kg: 100, reps: 5 }), makeSet({ weight_kg: 100, reps: 5 })]
    const result = getProgressionSuggestion(sets, 100, 3, 5)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(105, 0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- progression.service
```

- [ ] **Step 3: Implement progression.service.ts**

```typescript
// src/lib/services/progression.service.ts
import type { SetEntry, ProgressionSuggestion } from '@/lib/types/models'

export function getProgressionSuggestion(
  sets: SetEntry[],
  exerciseId: string,
  exerciseName: string,
  minReps: number,
  maxReps: number
): ProgressionSuggestion | null {
  if (sets.length === 0) return null

  const allHitTopRange = sets.every(s => s.reps >= maxReps)
  if (!allHitTopRange) return null

  const currentWeight = sets[0].weight_kg
  const increment = currentWeight >= 100 ? 5 : 2.5
  const suggested = currentWeight + increment

  return {
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    current_weight_kg: currentWeight,
    suggested_weight_kg: suggested,
    reason: `All sets hit ${maxReps} reps — try ${suggested}kg next session`,
  }
}
```

Note: The test helper passes weight separately, but the function uses `sets[0].weight_kg`. Update the test to use makeSet properly:

- [ ] **Step 4: Fix test to match function signature**

```typescript
// Update the test calls to pass exerciseId and exerciseName:
const result = getProgressionSuggestion(sets, 'e1', 'Bench Press', 8, 12)
```

Full corrected test file:
```typescript
// src/lib/services/progression.service.test.ts
import { describe, it, expect } from 'vitest'
import { getProgressionSuggestion } from './progression.service'
import type { SetEntry } from '@/lib/types/models'

function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: '1', session_id: 's1', user_id: 'u1', exercise_id: 'e1',
    set_number: 1, weight_kg: 80, reps: 10, rpe: null,
    calculated_1rm: null, rest_seconds: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getProgressionSuggestion', () => {
  it('suggests weight increase when all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 12 }), makeSet({ reps: 12 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Bench Press', 8, 12)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(82.5, 0)
  })

  it('returns null when not all sets hit top of rep range', () => {
    const sets = [makeSet({ reps: 12 }), makeSet({ reps: 10 }), makeSet({ reps: 8 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Bench Press', 8, 12)
    expect(result).toBeNull()
  })

  it('returns null for empty sets', () => {
    expect(getProgressionSuggestion([], 'e1', 'Bench Press', 8, 12)).toBeNull()
  })

  it('suggests 5kg increase for heavy lifts (>= 100kg)', () => {
    const sets = [makeSet({ weight_kg: 100, reps: 5 }), makeSet({ weight_kg: 100, reps: 5 })]
    const result = getProgressionSuggestion(sets, 'e1', 'Squat', 3, 5)
    expect(result).not.toBeNull()
    expect(result!.suggested_weight_kg).toBeCloseTo(105, 0)
  })
})
```

- [ ] **Step 5: Run tests to verify pass**

```bash
npm test -- progression.service
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/progression.service.ts src/lib/services/progression.service.test.ts
git commit -m "feat: add double progression service with tests"
```

---

## Task 6: Plate Calculator Utility + Tests

**Files:**
- Create: `src/lib/utils/plate-calculator.ts`
- Create: `src/lib/utils/plate-calculator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/utils/plate-calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePlates } from './plate-calculator'

describe('calculatePlates', () => {
  it('calculates plates for 100kg with 20kg bar', () => {
    // 100 - 20 = 80kg total plates, 40kg per side
    // 40 = 1×25 + 1×10 + 1×5
    const result = calculatePlates(100, 20)
    expect(result).toEqual([
      { weight: 25, count: 1 },
      { weight: 10, count: 1 },
      { weight: 5, count: 1 },
    ])
  })

  it('handles weight equal to bar weight', () => {
    expect(calculatePlates(20, 20)).toEqual([])
  })

  it('calculates plates for 60kg with 20kg bar', () => {
    // 60 - 20 = 40, per side = 20
    // 20 = 1×20
    const result = calculatePlates(60, 20)
    expect(result).toEqual([{ weight: 20, count: 1 }])
  })

  it('calculates plates for 142.5kg with 20kg bar', () => {
    // 142.5 - 20 = 122.5, per side = 61.25
    // 61.25 = 2×25 + 1×10 + 0.25×... → 2×25 + 1×10 + 1×1.25
    const result = calculatePlates(142.5, 20)
    expect(result).toEqual([
      { weight: 25, count: 2 },
      { weight: 10, count: 1 },
      { weight: 1.25, count: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- plate-calculator
```

- [ ] **Step 3: Implement plate-calculator.ts**

```typescript
// src/lib/utils/plate-calculator.ts
const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25]

export interface PlateCount {
  weight: number
  count: number
}

export function calculatePlates(totalWeightKg: number, barWeightKg = 20): PlateCount[] {
  const perSide = (totalWeightKg - barWeightKg) / 2
  if (perSide <= 0) return []

  const result: PlateCount[] = []
  let remaining = perSide

  for (const plate of PLATE_SIZES) {
    const count = Math.floor(remaining / plate + 0.001) // floating point tolerance
    if (count > 0) {
      result.push({ weight: plate, count })
      remaining -= count * plate
      remaining = Math.round(remaining * 100) / 100
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- plate-calculator
```
Expected: 4 tests PASS

- [ ] **Step 5: Run all tests to ensure nothing broken**

```bash
npm test
```
Expected: all tests pass (27+ tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/plate-calculator.ts src/lib/utils/plate-calculator.test.ts
git commit -m "feat: add plate calculator utility with tests"
```

---

## Task 7: Analytics Service

**Files:**
- Create: `src/lib/services/analytics.service.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/services/analytics.service.ts
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

  // Group by exercise and aggregate volumes
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

  const exercisesWithSets = Array.from(exerciseMap.values()).flatMap(ex =>
    Array.from({ length: ex.setCount }, () => ({
      exercise: { primary_muscle: ex.primary_muscle, secondary_muscles: ex.secondary_muscles },
      sets: [{}],
    }))
  )

  // Use existing calculateSessionVolume utility
  const fakeExercises = Array.from(exerciseMap.entries()).map(([, ex]) => ({
    primary_muscle: ex.primary_muscle,
    secondary_muscles: ex.secondary_muscles,
    sets: Array.from({ length: ex.setCount }, (_, i) => ({
      id: i.toString(), session_id: '', user_id: '', exercise_id: '',
      set_number: i, weight_kg: 0, reps: 0, rpe: null,
      calculated_1rm: null, rest_seconds: null, created_at: '',
    })),
  }))

  return calculateSessionVolume(fakeExercises as Parameters<typeof calculateSessionVolume>[0])
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/analytics.service.ts
git commit -m "feat: add analytics service (tonnage, muscle volume, volume landmarks)"
```

---

## Task 8: Create Workout Session Route

**Files:**
- Create: `src/app/(app)/workout/new/page.tsx`
- Create: `src/app/(app)/workout/new/actions.ts`

- [ ] **Step 1: Write actions.ts**

```typescript
// src/app/(app)/workout/new/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/db/workouts'
import { verifySession } from '@/lib/dal'

export async function startWorkoutAction(): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}`)
}
```

- [ ] **Step 2: Write page.tsx**

```tsx
// src/app/(app)/workout/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startWorkoutAction } from './actions'
import Link from 'next/link'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const active = await getActiveSession(supabase, user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Start Workout</h1>

      {active && (
        <Card className="bg-zinc-900 border-amber-800">
          <CardHeader>
            <CardTitle className="text-base text-amber-400">Active Session</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href={`/workout/${active.id}`} className={buttonVariants()}>
              Resume Workout
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <form action={startWorkoutAction}>
            <button
              type="submit"
              className={buttonVariants({ size: 'lg', className: 'w-full' })}
            >
              Start New Workout
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/workout/new/
git commit -m "feat: create workout session route"
```

---

## Task 9: Workout Page — Server Shell

**Files:**
- Create: `src/app/(app)/workout/[id]/page.tsx`
- Create: `src/app/(app)/workout/[id]/loading.tsx`

- [ ] **Step 1: Write loading.tsx**

```tsx
// src/app/(app)/workout/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-1/3" />
      <div className="h-48 bg-zinc-800 rounded" />
    </div>
  )
}
```

- [ ] **Step 2: Write page.tsx**

```tsx
// src/app/(app)/workout/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { WorkoutClient } from '@/components/workout/WorkoutClient'
import type { ExerciseWithSets } from '@/lib/types/models'

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await verifySession()
  const supabase = await createClient()

  const session = await getSession(supabase, id)
  if (!session || session.user_id !== user.id) notFound()
  if (session.finished_at) redirect('/history/' + id)

  const sets = await getSetsForSession(supabase, id)
  const allExercises = await getExercises(supabase, user.id)

  // Group sets by exercise
  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  return (
    <WorkoutClient
      session={session}
      initialExercises={Array.from(exerciseMap.values())}
      allExercises={allExercises}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/workout/[id]/page.tsx src/app/(app)/workout/[id]/loading.tsx
git commit -m "feat: workout page server shell"
```

---

## Task 10: Workout Server Actions

**Files:**
- Create: `src/app/(app)/workout/[id]/actions.ts`

- [ ] **Step 1: Write actions.ts**

```typescript
// src/app/(app)/workout/[id]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addSet, getSetsForSession, getBestE1RMForExercise } from '@/lib/db/sets'
import { finishSession } from '@/lib/db/workouts'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { getProgressionSuggestion } from '@/lib/services/progression.service'
import { calculateSessionVolume } from '@/lib/utils/muscle-volume'
import type { Exercise, SetEntry, PRResult, ProgressionSuggestion } from '@/lib/types/models'

export async function saveSetAction(data: {
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
}): Promise<{ set: SetEntry; prResult: PRResult }> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const calculated1rm = calculate1RM(data.weightKg, data.reps)

  const set = await addSet(supabase, {
    sessionId: data.sessionId,
    userId: user.id,
    exerciseId: data.exerciseId,
    setNumber: data.setNumber,
    weightKg: data.weightKg,
    reps: data.reps,
    rpe: data.rpe,
    calculated1rm,
  })

  const previousBest = await getBestE1RMForExercise(supabase, user.id, data.exerciseId, set.id)
  const prResult = detectPRFromHistory(calculated1rm, previousBest)

  return { set, prResult }
}

export async function searchExercisesAction(query: string): Promise<Exercise[]> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .or(`is_custom.eq.false,created_by.eq.${user.id}`)
    .order('name')
    .limit(20)

  return (data as Exercise[]) ?? []
}

export async function finishWorkoutAction(
  sessionId: string,
  exercisesWithSets: Array<{ exercise: Exercise; sets: SetEntry[] }>
): Promise<{ suggestions: ProgressionSuggestion[] }> {
  const { user } = await verifySession()
  const supabase = await createClient()

  // Recalculate total volume from DB to ensure accuracy
  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  // Build progression suggestions
  const suggestions: ProgressionSuggestion[] = []
  for (const { exercise, sets } of exercisesWithSets) {
    if (sets.length === 0) continue
    // Default rep ranges by mechanic
    const [minReps, maxReps] = exercise.mechanic === 'compound' ? [5, 8] : [10, 15]
    const suggestion = getProgressionSuggestion(sets, exercise.id, exercise.name, minReps, maxReps)
    if (suggestion) suggestions.push(suggestion)
  }

  revalidatePath('/dashboard')
  revalidatePath('/history')
  redirect('/history/' + sessionId + '?finished=1')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/workout/[id]/actions.ts
git commit -m "feat: workout server actions (save set, search, finish)"
```

---

## Task 11: WorkoutClient Component

**Files:**
- Create: `src/components/workout/WorkoutClient.tsx`

- [ ] **Step 1: Write WorkoutClient.tsx**

```tsx
// src/components/workout/WorkoutClient.tsx
'use client'

import { useState } from 'react'
import type { WorkoutSession, Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { ExerciseSearch } from './ExerciseSearch'
import { ExerciseBlock } from './ExerciseBlock'
import { FinishWorkoutButton } from './FinishWorkoutButton'

interface Props {
  session: WorkoutSession
  initialExercises: ExerciseWithSets[]
  allExercises: Exercise[]
}

export function WorkoutClient({ session, initialExercises, allExercises }: Props) {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>(initialExercises)

  function addExercise(exercise: Exercise) {
    if (exercises.some(e => e.id === exercise.id)) return
    setExercises(prev => [...prev, { ...exercise, sets: [] }])
  }

  function appendSet(exerciseId: string, set: SetEntry) {
    setExercises(prev =>
      prev.map(e => e.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e)
    )
  }

  const started = new Date(session.started_at)
  const duration = Math.round((Date.now() - started.getTime()) / 60000)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workout</h1>
          <p className="text-sm text-zinc-400">{duration}m elapsed</p>
        </div>
        <FinishWorkoutButton sessionId={session.id} exercises={exercises} />
      </div>

      <ExerciseSearch onSelect={addExercise} />

      {exercises.length === 0 && (
        <p className="text-center text-zinc-500 py-12">
          Search for an exercise above to start logging
        </p>
      )}

      {exercises.map(ex => (
        <ExerciseBlock
          key={ex.id}
          exercise={ex}
          sessionId={session.id}
          onSetSaved={(set) => appendSet(ex.id, set)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workout/WorkoutClient.tsx
git commit -m "feat: WorkoutClient component"
```

---

## Task 12: Exercise Search, Block, Set Row, PR Badge

**Files:**
- Create: `src/components/workout/ExerciseSearch.tsx`
- Create: `src/components/workout/ExerciseBlock.tsx`
- Create: `src/components/workout/SetRow.tsx`
- Create: `src/components/workout/PRBadge.tsx`
- Create: `src/components/workout/LastTimeHint.tsx`

- [ ] **Step 1: Write ExerciseSearch.tsx**

```tsx
// src/components/workout/ExerciseSearch.tsx
'use client'

import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchExercisesAction } from '@/app/(app)/workout/[id]/actions'
import type { Exercise } from '@/lib/types/models'

interface Props {
  onSelect: (exercise: Exercise) => void
}

export function ExerciseSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    setQuery(value)
    if (value.length < 2) { setResults([]); return }
    startTransition(async () => {
      const found = await searchExercisesAction(value)
      setResults(found)
    })
  }

  function select(ex: Exercise) {
    onSelect(ex)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search exercises..."
          className="pl-9 bg-zinc-900 border-zinc-700"
          value={query}
          onChange={e => handleChange(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map(ex => (
            <li key={ex.id}>
              <button
                className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-sm"
                onClick={() => select(ex)}
              >
                <span className="font-medium">{ex.name}</span>
                <span className="text-zinc-500 ml-2">{ex.primary_muscle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write PRBadge.tsx**

```tsx
// src/components/workout/PRBadge.tsx
import type { PRResult } from '@/lib/types/models'

export function PRBadge({ pr }: { pr: PRResult }) {
  if (!pr.is_pr) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-black">
      {pr.previous_1rm ? `PR +${pr.improvement_pct?.toFixed(1)}%` : '🏆 First set!'}
    </span>
  )
}
```

- [ ] **Step 3: Write LastTimeHint.tsx**

```tsx
// src/components/workout/LastTimeHint.tsx
import type { SetEntry } from '@/lib/types/models'

export function LastTimeHint({ sets }: { sets: SetEntry[] }) {
  if (sets.length === 0) return null
  const last = sets[sets.length - 1]
  return (
    <p className="text-xs text-zinc-500">
      Last time: {last.weight_kg}kg × {last.reps}
      {last.rpe ? ` @ RPE ${last.rpe}` : ''}
    </p>
  )
}
```

- [ ] **Step 4: Write SetRow.tsx**

```tsx
// src/components/workout/SetRow.tsx
'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveSetAction } from '@/app/(app)/workout/[id]/actions'
import { PRBadge } from './PRBadge'
import { RestTimer } from './RestTimer'
import type { SetEntry, PRResult } from '@/lib/types/models'

interface Props {
  sessionId: string
  exerciseId: string
  setNumber: number
  defaultWeight?: number
  defaultReps?: number
  onSaved: (set: SetEntry) => void
}

export function SetRow({ sessionId, exerciseId, setNumber, defaultWeight = 0, defaultReps = 8, onSaved }: Props) {
  const [weight, setWeight] = useState(String(defaultWeight || ''))
  const [reps, setReps] = useState(String(defaultReps || ''))
  const [rpe, setRpe] = useState('')
  const [saved, setSaved] = useState(false)
  const [pr, setPr] = useState<PRResult | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (!w || !r) return

    startTransition(async () => {
      const { set, prResult } = await saveSetAction({
        sessionId,
        exerciseId,
        setNumber,
        weightKg: w,
        reps: r,
        rpe: rpe ? parseFloat(rpe) : undefined,
      })
      setSaved(true)
      setPr(prResult)
      setShowTimer(true)
      onSaved(set)
    })
  }

  if (saved) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 w-8">#{setNumber}</span>
          <span className="font-medium">{weight}kg × {reps}</span>
          {rpe && <span className="text-zinc-500">RPE {rpe}</span>}
          <Check className="h-4 w-4 text-green-500 ml-auto" />
          {pr && <PRBadge pr={pr} />}
        </div>
        {showTimer && <RestTimer seconds={90} onDone={() => setShowTimer(false)} />}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-sm w-8">#{setNumber}</span>
      <div className="flex gap-2 items-center flex-1">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeight(v => String(Math.max(0, parseFloat(v || '0') - 2.5)))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">−</button>
          <Input value={weight} onChange={e => setWeight(e.target.value)} className="w-20 text-center bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="kg" />
          <button onClick={() => setWeight(v => String(parseFloat(v || '0') + 2.5))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">+</button>
        </div>
        <span className="text-zinc-600">×</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setReps(v => String(Math.max(1, parseInt(v || '1') - 1)))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">−</button>
          <Input value={reps} onChange={e => setReps(e.target.value)} className="w-16 text-center bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="reps" />
          <button onClick={() => setReps(v => String(parseInt(v || '0') + 1))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">+</button>
        </div>
        <Input value={rpe} onChange={e => setRpe(e.target.value)} className="w-16 bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="RPE" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={isPending || !weight || !reps}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Write ExerciseBlock.tsx**

```tsx
// src/components/workout/ExerciseBlock.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SetRow } from './SetRow'
import { LastTimeHint } from './LastTimeHint'
import { PlateCalculator } from './PlateCalculator'
import type { ExerciseWithSets, SetEntry } from '@/lib/types/models'

interface Props {
  exercise: ExerciseWithSets
  sessionId: string
  onSetSaved: (set: SetEntry) => void
}

export function ExerciseBlock({ exercise, sessionId, onSetSaved }: Props) {
  const [sets, setSets] = useState<SetEntry[]>(exercise.sets)
  const [showCalc, setShowCalc] = useState(false)

  const lastWeight = sets[sets.length - 1]?.weight_kg
  const lastReps = sets[sets.length - 1]?.reps

  function handleSetSaved(set: SetEntry) {
    setSets(prev => [...prev, set])
    onSetSaved(set)
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            <p className="text-xs text-zinc-500 capitalize">{exercise.primary_muscle} · {exercise.equipment}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCalc(v => !v)}>
            🏋️
          </Button>
        </div>
        {showCalc && lastWeight && <PlateCalculator weightKg={lastWeight} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Previous session hint */}
        <LastTimeHint sets={[]} />

        {/* Completed sets */}
        {sets.map(set => (
          <div key={set.id} className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="w-8">#{set.set_number}</span>
            <span>{set.weight_kg}kg × {set.reps}</span>
          </div>
        ))}

        {/* New set input */}
        <SetRow
          sessionId={sessionId}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={lastWeight}
          defaultReps={lastReps}
          onSaved={handleSetSaved}
        />

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-zinc-500"
          onClick={() => {
            const fakeSet = {
              id: `pending-${sets.length}`,
              session_id: sessionId,
              user_id: '',
              exercise_id: exercise.id,
              set_number: sets.length + 2,
              weight_kg: lastWeight ?? 0,
              reps: lastReps ?? 8,
              rpe: null, calculated_1rm: null, rest_seconds: null,
              created_at: '',
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Set
        </Button>
      </CardContent>
    </Card>
  )
}
```

Note: The "Add Set" button in ExerciseBlock above shows the next SetRow automatically when a set is saved (setNumber increments). The button isn't strictly needed since SetRow always shows a new empty row after saving. Remove the onClick body above — it does nothing useful. The component already always shows one pending SetRow at `sets.length + 1`. For adding another simultaneous pending set, you'd need extra state, but YAGNI — one pending set at a time is the right UX for a gym app.

- [ ] **Step 6: Commit**

```bash
git add src/components/workout/
git commit -m "feat: workout UI components (search, exercise block, set row, PR badge)"
```

---

## Task 13: Rest Timer + Plate Calculator

**Files:**
- Create: `src/components/workout/RestTimer.tsx`
- Create: `src/components/workout/PlateCalculator.tsx`

- [ ] **Step 1: Write RestTimer.tsx**

```tsx
// src/components/workout/RestTimer.tsx
'use client'

import { useState, useEffect } from 'react'
import { Timer } from 'lucide-react'

interface Props {
  seconds: number
  onDone: () => void
}

export function RestTimer({ seconds, onDone }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onDone])

  const pct = (remaining / seconds) * 100
  const color = remaining > 30 ? 'text-green-400' : remaining > 10 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-2 text-sm">
      <Timer className="h-4 w-4 text-zinc-500" />
      <span className={`font-mono font-bold ${color}`}>
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
      </span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full">
        <div className="h-1 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write PlateCalculator.tsx**

```tsx
// src/components/workout/PlateCalculator.tsx
import { calculatePlates } from '@/lib/utils/plate-calculator'

interface Props {
  weightKg: number
  barWeightKg?: number
}

const PLATE_COLORS: Record<number, string> = {
  25: 'bg-red-600', 20: 'bg-blue-600', 15: 'bg-yellow-500',
  10: 'bg-green-600', 5: 'bg-zinc-400', 2.5: 'bg-zinc-300', 1.25: 'bg-zinc-200',
}

export function PlateCalculator({ weightKg, barWeightKg = 20 }: Props) {
  const plates = calculatePlates(weightKg, barWeightKg)

  return (
    <div className="mt-2 p-3 bg-zinc-800 rounded-lg">
      <p className="text-xs text-zinc-400 mb-2">Plates per side ({barWeightKg}kg bar):</p>
      {plates.length === 0 ? (
        <p className="text-xs text-zinc-500">Bar only</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plates.map((p, i) => (
            <div key={i} className={`${PLATE_COLORS[p.weight] ?? 'bg-zinc-600'} text-white text-xs font-bold px-2 py-1 rounded`}>
              {p.count}×{p.weight}kg
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write FinishWorkoutButton.tsx**

```tsx
// src/components/workout/FinishWorkoutButton.tsx
'use client'

import { useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { finishWorkoutAction } from '@/app/(app)/workout/[id]/actions'
import type { ExerciseWithSets } from '@/lib/types/models'

interface Props {
  sessionId: string
  exercises: ExerciseWithSets[]
}

export function FinishWorkoutButton({ sessionId, exercises }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleFinish() {
    startTransition(async () => {
      await finishWorkoutAction(sessionId, exercises)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFinish}
      disabled={isPending}
      className="border-green-700 text-green-400 hover:bg-green-900"
    >
      <CheckCircle className="h-4 w-4 mr-1" />
      {isPending ? 'Finishing...' : 'Finish'}
    </Button>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workout/RestTimer.tsx src/components/workout/PlateCalculator.tsx src/components/workout/FinishWorkoutButton.tsx
git commit -m "feat: rest timer, plate calculator, finish workout button"
```

---

## Task 14: Exercise Library Page

**Files:**
- Create: `src/app/(app)/exercise-library/page.tsx`
- Create: `src/app/(app)/exercise-library/actions.ts`
- Create: `src/components/exercise/ExerciseForm.tsx`

- [ ] **Step 1: Write actions.ts**

```typescript
// src/app/(app)/exercise-library/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createExercise, updateExercise, deleteExercise } from '@/lib/db/exercises'

const exerciseSchema = z.object({
  name: z.string().min(2).max(100),
  primary_muscle: z.string(),
  secondary_muscles: z.array(z.string()).default([]),
  mechanic: z.enum(['compound', 'isolation']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']),
  slug: z.string().optional(),
})

export async function createExerciseAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const parsed = exerciseSchema.parse({
    name: formData.get('name'),
    primary_muscle: formData.get('primary_muscle'),
    secondary_muscles: formData.getAll('secondary_muscles'),
    mechanic: formData.get('mechanic'),
    equipment: formData.get('equipment'),
  })

  const slug = parsed.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  await createExercise(supabase, user.id, { ...parsed, slug, secondary_muscles: parsed.secondary_muscles as string[] } as Parameters<typeof createExercise>[2])
  revalidatePath('/exercise-library')
}

export async function deleteExerciseAction(id: string): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  await deleteExercise(supabase, id)
  revalidatePath('/exercise-library')
}
```

- [ ] **Step 2: Write page.tsx**

```tsx
// src/app/(app)/exercise-library/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import type { MuscleGroup, Equipment } from '@/lib/types/models'

const MUSCLES: MuscleGroup[] = ['chest', 'back', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts']
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string; equipment?: string }>
}) {
  const { muscle, equipment } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const exercises = await getExercises(supabase, user.id, {
    muscle: muscle as MuscleGroup | undefined,
    equipment: equipment as Equipment | undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <ExerciseForm />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {MUSCLES.map(m => (
          <a key={m} href={`?muscle=${m}${equipment ? `&equipment=${equipment}` : ''}`}>
            <Badge variant={muscle === m ? 'default' : 'outline'} className="cursor-pointer capitalize">{m.replace('_', ' ')}</Badge>
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map(e => (
          <a key={e} href={`?${muscle ? `muscle=${muscle}&` : ''}equipment=${e}`}>
            <Badge variant={equipment === e ? 'default' : 'outline'} className="cursor-pointer capitalize">{e}</Badge>
          </a>
        ))}
        {(muscle || equipment) && (
          <a href="/exercise-library">
            <Badge variant="destructive" className="cursor-pointer">Clear</Badge>
          </a>
        )}
      </div>

      <div className="space-y-2">
        {exercises.map(ex => (
          <Card key={ex.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{ex.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{ex.primary_muscle} · {ex.equipment} · {ex.mechanic}</p>
              </div>
              {ex.is_custom && (
                <Badge variant="outline" className="text-xs">Custom</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write ExerciseForm.tsx**

```tsx
// src/components/exercise/ExerciseForm.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExerciseAction } from '@/app/(app)/exercise-library/actions'

export function ExerciseForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1" /> Add Custom
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Create Custom Exercise</h2>
        <form action={async (fd) => { await createExerciseAction(fd); setOpen(false) }} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="Exercise name" className="mt-1 bg-zinc-800 border-zinc-700" required />
          </div>
          <div>
            <Label>Primary Muscle</Label>
            <select name="primary_muscle" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm" required>
              {['chest','back','biceps','triceps','forearms','core','quads','hamstrings','glutes','calves','traps','lats','rear_delts','front_delts','side_delts'].map(m => (
                <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Mechanic</Label>
            <select name="mechanic" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm">
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
            </select>
          </div>
          <div>
            <Label>Equipment</Label>
            <select name="equipment" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm">
              {['barbell','dumbbell','machine','cable','bodyweight','other'].map(e => (
                <option key={e} value={e} className="capitalize">{e}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Save</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/exercise-library/ src/components/exercise/
git commit -m "feat: exercise library page with filters and custom exercise creation"
```

---

## Task 15: History Pages

**Files:**
- Create: `src/app/(app)/history/page.tsx`
- Create: `src/app/(app)/history/[sessionId]/page.tsx`

- [ ] **Step 1: Write history/page.tsx**

```tsx
// src/app/(app)/history/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions } from '@/lib/db/workouts'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function HistoryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const sessions = await getRecentSessions(supabase, user.id, 50)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      {sessions.length === 0 && (
        <p className="text-zinc-500 text-center py-12">No finished workouts yet.</p>
      )}

      {sessions.map(s => {
        const date = new Date(s.started_at)
        const duration = s.finished_at
          ? Math.round((new Date(s.finished_at).getTime() - date.getTime()) / 60000)
          : null

        return (
          <Link key={s.id} href={`/history/${s.id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-zinc-500">
                    {(s.total_volume_kg ?? 0).toFixed(0)}kg total
                    {duration ? ` · ${duration}m` : ''}
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

- [ ] **Step 2: Write history/[sessionId]/page.tsx**

```tsx
// src/app/(app)/history/[sessionId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExerciseWithSets } from '@/lib/types/models'

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

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) notFound()

  const sets = await getSetsForSession(supabase, sessionId)
  const allExercises = await getExercises(supabase, user.id)

  // Group sets by exercise
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

  return (
    <div className="space-y-6">
      {finished === '1' && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-green-400 text-sm font-medium">
          Workout complete! Great work 💪
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">
          {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-zinc-400 text-sm">
          {(session.total_volume_kg ?? 0).toFixed(0)}kg total volume
          {duration ? ` · ${duration} minutes` : ''}
        </p>
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
                  <th className="text-left pb-1">Set</th>
                  <th className="text-left pb-1">Weight</th>
                  <th className="text-left pb-1">Reps</th>
                  <th className="text-left pb-1">e1RM</th>
                  <th className="text-left pb-1">RPE</th>
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
        <p className="text-zinc-500 text-center py-8">No exercises logged in this session.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/history/
git commit -m "feat: history list and session detail pages"
```

---

## Task 16: Full Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/dashboard/ScheduleStatus.tsx`
- Create: `src/components/dashboard/MuscleHeatmap.tsx`

- [ ] **Step 1: Write ScheduleStatus.tsx**

```tsx
// src/components/dashboard/ScheduleStatus.tsx
import { Dumbbell, Moon } from 'lucide-react'

interface Props {
  schedule: number[]  // ISO weekdays 1=Mon…7=Sun
}

export function ScheduleStatus({ schedule }: Props) {
  const todayISO = new Date().getDay() || 7  // convert Sun=0 to 7
  const isGymDay = schedule.includes(todayISO)

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${isGymDay ? 'bg-green-900/30 border border-green-800' : 'bg-zinc-800 border border-zinc-700'}`}>
      {isGymDay ? <Dumbbell className="h-5 w-5 text-green-400" /> : <Moon className="h-5 w-5 text-zinc-400" />}
      <div>
        <p className="font-medium text-sm">{isGymDay ? 'Training Day' : 'Rest Day'}</p>
        <p className="text-xs text-zinc-400">
          {schedule.length === 0
            ? 'No schedule set'
            : `Training: ${schedule.map(d => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write MuscleHeatmap.tsx**

```tsx
// src/components/dashboard/MuscleHeatmap.tsx
'use client'

import Model from 'react-body-highlighter'
import type { MuscleVolume } from '@/lib/types/models'

// Map our muscle groups to react-body-highlighter muscle names
const MUSCLE_MAP: Record<string, string> = {
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
  front_delts: 'deltoids',
  side_delts: 'deltoids',
  rear_delts: 'back-deltoids',
}

interface Props {
  muscleVolumes: MuscleVolume[]
}

export function MuscleHeatmap({ muscleVolumes }: Props) {
  const data = muscleVolumes
    .filter(mv => mv.total_sets > 0)
    .map(mv => ({
      name: 'Session',
      muscles: [MUSCLE_MAP[mv.muscle]].filter(Boolean),
    }))

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">Log workouts to see your muscle heatmap.</p>
  }

  return (
    <div className="flex justify-center gap-4">
      <Model
        data={data}
        style={{ width: '120px', padding: '5px' }}
        highlightedColors={['#16a34a', '#15803d', '#166534']}
      />
      <Model
        data={data}
        type="posterior"
        style={{ width: '120px', padding: '5px' }}
        highlightedColors={['#16a34a', '#15803d', '#166534']}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update dashboard/page.tsx**

```tsx
// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Plus } from 'lucide-react'
import Link from 'next/link'
import { ScheduleStatus } from '@/components/dashboard/ScheduleStatus'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { getWeeklyMuscleVolume } from '@/lib/services/analytics.service'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const supabase = await createClient()

  const [sessionsResult, profileResult] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, started_at, total_volume_kg, finished_at')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(3),
    supabase
      .from('profiles')
      .select('training_schedule')
      .eq('id', user.id)
      .single(),
  ])

  const sessions = sessionsResult.data ?? []
  const schedule: number[] = profileResult.data?.training_schedule ?? []
  const muscleVolumes = await getWeeklyMuscleVolume(supabase, user.id, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/workout/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Start Workout
        </Link>
      </div>

      <ScheduleStatus schedule={schedule} />

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Recent Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <ul className="space-y-2">
              {sessions.map(s => {
                const date = new Date(s.started_at)
                return (
                  <li key={s.id} className="flex justify-between text-sm">
                    <Link href={`/history/${s.id}`} className="hover:text-zinc-200">
                      {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Link>
                    <span className="text-zinc-400">{(s.total_volume_kg ?? 0).toFixed(0)} kg</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">No workouts yet. Start your first session!</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Muscle Activity (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleHeatmap muscleVolumes={muscleVolumes} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx src/components/dashboard/
git commit -m "feat: full dashboard with schedule status and muscle heatmap"
```

---

## Task 17: Analytics Page

**Files:**
- Create: `src/app/(app)/analytics/page.tsx`
- Create: `src/components/analytics/ProgressChart.tsx`
- Create: `src/components/analytics/TonnageChart.tsx`
- Create: `src/components/analytics/VolumeLandmarks.tsx`

- [ ] **Step 1: Write ProgressChart.tsx**

```tsx
// src/components/analytics/ProgressChart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint { date: string; e1rm: number }

export function ProgressChart({ data, exerciseName }: { data: DataPoint[]; exerciseName: string }) {
  if (data.length < 2) {
    return <p className="text-zinc-500 text-sm">Log at least 2 sessions to see trend.</p>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit="kg" width={45} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px' }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#22c55e' }}
          />
          <Line type="monotone" dataKey="e1rm" stroke="#22c55e" strokeWidth={2} dot={false} name="e1RM" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Write TonnageChart.tsx**

```tsx
// src/components/analytics/TonnageChart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TonnageByMonth } from '@/lib/services/analytics.service'

export function TonnageChart({ data }: { data: TonnageByMonth[] }) {
  if (data.length === 0) {
    return <p className="text-zinc-500 text-sm">No data yet.</p>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit="kg" width={55} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px' }}
            formatter={(v: number) => [`${v.toFixed(0)}kg`, 'Volume']}
          />
          <Bar dataKey="total_kg" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Write VolumeLandmarks.tsx**

```tsx
// src/components/analytics/VolumeLandmarks.tsx
import type { VolumeLandmark } from '@/lib/types/models'

const STATUS_CONFIG = {
  mv: { label: 'Low (MV)', color: 'text-yellow-400 bg-yellow-900/30' },
  optimal: { label: 'Optimal', color: 'text-green-400 bg-green-900/30' },
  mrv: { label: 'Very High', color: 'text-red-400 bg-red-900/30' },
}

export function VolumeLandmarks({ landmarks }: { landmarks: VolumeLandmark[] }) {
  if (landmarks.length === 0) {
    return <p className="text-zinc-500 text-sm">Log workouts to see volume status.</p>
  }

  return (
    <div className="space-y-2">
      {landmarks.map(l => {
        const config = STATUS_CONFIG[l.status]
        return (
          <div key={l.muscle} className="flex items-center justify-between">
            <span className="text-sm capitalize">{l.muscle.replace('_', ' ')}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{l.weekly_sets} sets/wk</span>
              <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>{config.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Write analytics/page.tsx**

```tsx
// src/app/(app)/analytics/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import { TonnageChart } from '@/components/analytics/TonnageChart'
import { VolumeLandmarks } from '@/components/analytics/VolumeLandmarks'
import { getMonthlyTonnage, getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import { getE1RMHistory } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>
}) {
  const { exercise: exerciseId } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const [exercises, tonnage, muscleVolumes] = await Promise.all([
    getExercises(supabase, user.id),
    getMonthlyTonnage(supabase, user.id),
    getWeeklyMuscleVolume(supabase, user.id, 4),
  ])

  const landmarks = getVolumeLandmarks(muscleVolumes)

  const selectedExercise = exerciseId ? exercises.find(e => e.id === exerciseId) : exercises[0]
  const e1rmHistory = selectedExercise
    ? await getE1RMHistory(supabase, user.id, selectedExercise.id)
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">e1RM Progress</CardTitle>
            <select
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
              defaultValue={selectedExercise?.id}
            >
              {exercises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ProgressChart data={e1rmHistory} exerciseName={selectedExercise?.name ?? ''} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Monthly Volume</CardTitle></CardHeader>
        <CardContent>
          <TonnageChart data={tonnage} />
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Volume Landmarks (4 weeks)</CardTitle></CardHeader>
        <CardContent>
          <VolumeLandmarks landmarks={landmarks} />
        </CardContent>
      </Card>
    </div>
  )
}
```

Note: The exercise selector on analytics page needs to be a Client Component for the `onChange` to navigate. Wrap the select in a small client component:

- [ ] **Step 5: Fix exercise selector — make it a client component**

Create `src/components/analytics/ExerciseSelector.tsx`:
```tsx
// src/components/analytics/ExerciseSelector.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { Exercise } from '@/lib/types/models'

export function ExerciseSelector({ exercises, selected }: { exercises: Exercise[]; selected?: string }) {
  const router = useRouter()
  return (
    <select
      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
      defaultValue={selected}
      onChange={e => router.push(`/analytics?exercise=${e.target.value}`)}
    >
      {exercises.map(e => (
        <option key={e.id} value={e.id}>{e.name}</option>
      ))}
    </select>
  )
}
```

Update analytics/page.tsx to import and use `ExerciseSelector` instead of the raw `<select>`.

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/analytics/ src/components/analytics/
git commit -m "feat: analytics page with e1RM chart, tonnage chart, volume landmarks"
```

---

## Task 18: Profile Page

**Files:**
- Create: `src/app/(app)/profile/page.tsx`
- Create: `src/app/(app)/profile/actions.ts`

- [ ] **Step 1: Write actions.ts**

```typescript
// src/app/(app)/profile/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

const profileSchema = z.object({
  weight_kg: z.coerce.number().positive().optional(),
  height_cm: z.coerce.number().positive().optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  training_since: z.string().optional(),
  training_location: z.enum(['gym', 'home', 'both']).optional(),
  training_schedule: z.array(z.coerce.number().int().min(1).max(7)).default([]),
})

export async function updateProfileAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const raw = {
    weight_kg: formData.get('weight_kg') || undefined,
    height_cm: formData.get('height_cm') || undefined,
    age: formData.get('age') || undefined,
    training_since: formData.get('training_since') || undefined,
    training_location: formData.get('training_location') || undefined,
    training_schedule: formData.getAll('training_schedule'),
  }

  const parsed = profileSchema.parse(raw)

  const { error } = await supabase
    .from('profiles')
    .update(parsed)
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Write profile/page.tsx**

```tsx
// src/app/(app)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
import { updateProfileAction } from './actions'
import type { Profile } from '@/lib/types/models'

const DAYS = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 },
]

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null

  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null

  const trainingAge = p?.training_since
    ? Math.round((Date.now() - new Date(p.training_since).getTime()) / (365.25 * 24 * 3600 * 1000) * 10) / 10
    : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Auto-computed stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">BMI</p>
            <p className="text-2xl font-bold">{bmi ? bmi.toFixed(1) : '—'}</p>
            {bmiCat && <p className="text-xs text-zinc-400">{bmiCat}</p>}
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Training Age</p>
            <p className="text-2xl font-bold">{trainingAge ? `${trainingAge}y` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Edit Profile</CardTitle></CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight (kg)</Label>
                <Input name="weight_kg" type="number" step="0.1" defaultValue={p?.weight_kg ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input name="height_cm" type="number" step="0.1" defaultValue={p?.height_cm ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Age</Label>
                <Input name="age" type="number" defaultValue={p?.age ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Training since</Label>
                <Input name="training_since" type="date" defaultValue={p?.training_since ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <select name="training_location" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm" defaultValue={p?.training_location ?? ''}>
                <option value="">Select...</option>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <Label>Training days</Label>
              <div className="flex gap-2 mt-2">
                {DAYS.map(d => (
                  <label key={d.value} className="flex flex-col items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      name="training_schedule"
                      value={d.value}
                      defaultChecked={(p?.training_schedule ?? []).includes(d.value)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-700 peer-checked:bg-blue-600 peer-checked:border-blue-600 text-xs font-medium">
                      {d.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">Save Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <p className="text-sm text-zinc-400">Email: {user.email}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/profile/
git commit -m "feat: profile page with edit form, BMI, training age display"
```

---

## Task 19: Wire Up Navigation

The bottom nav in `src/app/(app)/layout.tsx` already has links for History, Analytics, Profile. Add Exercise Library:

- [ ] **Step 1: Update layout nav**

In `src/app/(app)/layout.tsx`, find the `<nav>` section and add an Exercise Library link. The nav currently has: Dashboard, History, Analytics, Profile (4 items). Add Library after History:

```tsx
// In src/app/(app)/layout.tsx nav section, add after History link:
<Link href="/exercise-library" className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 py-1">
  <BookOpen className="h-5 w-5" />
  Library
</Link>
```

Add `BookOpen` to the lucide-react import at the top.

- [ ] **Step 2: Update Start Workout link on dashboard**

The dashboard "Start Workout" button currently links to `/workout/new` — verify this is correct (it should be, we created `/workout/new/page.tsx`).

- [ ] **Step 3: Run tests to verify nothing broken**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: add exercise library to navigation"
```

---

## Task 20: Final Verification

- [ ] **Step 1: Build check**

```bash
cd TrainingAR && npm run build 2>&1 | tail -30
```
Expected: successful build with no type errors

- [ ] **Step 2: Fix any TypeScript errors**

Common issues to fix:
- `ExerciseWithSets` imported from wrong path
- `calculateSessionVolume` expects specific shape — verify `ExerciseWithSets` matches
- `react-body-highlighter` may have different API — check types: `import Model from 'react-body-highlighter'`

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: 30+ tests all passing

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete GymLog phases 2-7 (workout logging, history, analytics, profile)"
```

---

## Post-Implementation Notes

**Known gaps to address after initial implementation:**

1. **Last Time Hints in ExerciseBlock** — the `<LastTimeHint sets={[]} />` currently always passes empty array. Fix: fetch previous session's sets via a Server Action when the exercise is added. Create `getPreviousSetsAction(exerciseId, currentSessionId)` in workout actions.

2. **Analytics exercise selector** — the select's `onChange` navigates client-side but the page re-renders server-side. The e1RM chart won't update without a page reload because the exercise selection drives a server fetch. The `ExerciseSelector` component handles this via `router.push`.

3. **Plate calculator in ExerciseBlock** — shows for the last weight in state. When no sets yet, `lastWeight` is undefined and the calculator won't render. This is correct behavior.

4. **Double progression suggestions** — currently shown via `finishWorkoutAction` redirect to history page with `?finished=1`. The suggestions are computed but not displayed. To display them: store suggestions in the session detail query or pass via cookie. Simplest approach: after finish redirects to `/history/[id]?finished=1`, fetch progression suggestions on that page by re-running the progression logic against the session's set data.
