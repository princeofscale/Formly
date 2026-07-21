# Офлайн-режим «Тренировка неубиваема» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Активная тренировка переживает потерю сети: перезагрузка страницы, лог сетов и завершение работают офлайн и синхронизируются при появлении сети; остальные разделы офлайн показывают заглушку.

**Architecture:** Расширяем существующий рукописный `public/sw.js` runtime-кэшированием (cache-first для статики, network-first с фолбэком для `/workout/<uuid>`, прекэш `/offline`). Очередь в IndexedDB получает второй store `finish_queue`; слив — сначала сеты, затем finish (сервер пересчитывает тоннаж из сетов). При монтировании `WorkoutClient` подмешивает заочередённые сеты в UI через чистую функцию `mergeQueuedSets`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, IndexedDB, Service Worker API, vitest (jsdom), next-intl.

**Spec:** `docs/superpowers/specs/2026-07-19-offline-workout-design.md`

## Global Constraints

- Никаких новых npm-зависимостей (в т.ч. никакого `fake-indexeddb` — тестируем только чистые функции).
- Тесты лежат рядом с исходником: `src/lib/utils/offline-merge.test.ts` (паттерн `src/lib/utils/one-rep-max.test.ts`).
- Тестируемая логика — чистые функции без IDB; IDB-обвязка остаётся тонкой и не тестируется (как существующий `offline-queue.ts`).
- i18n: каждый новый ключ добавляется в ОБА файла `messages/ru.json` и `messages/en.json` в существующий блок `"offline"` (ru.json строка ~321).
- Коммит после каждой задачи; lint-staged прогонит eslint/prettier сам.
- Проверочные команды: `npx tsc --noEmit`, `npx vitest run <file>`, `npx eslint <files>`.
- В `sw.js` нельзя ломать существующую логику: push, rest-timer (`rest-timer-start`/`rest-timer-cancel`), notificationclick, `skipWaiting`/`clients.claim`.
- Клиентский паттерн определения офлайна — как в `SetRow.tsx:184-187`: `!navigator.onLine || (err instanceof TypeError && /fetch|network/i.test(err.message))`.

---

### Task 1: `mergeQueuedSets` — чистый merge очереди в список упражнений

**Files:**
- Create: `src/lib/utils/offline-merge.ts`
- Test: `src/lib/utils/offline-merge.test.ts`

**Interfaces:**
- Consumes: `QueuedSetRecord` из `@/lib/utils/offline-queue`, `calculate1RM` из `@/lib/utils/one-rep-max`, типы `Exercise, ExerciseWithSets, SetEntry` из `@/lib/types/models`.
- Produces: `mergeQueuedSets(exercises: ExerciseWithSets[], allExercises: Exercise[], queued: QueuedSetRecord[], sessionId: string): ExerciseWithSets[]` — используется в Task 6.

- [ ] **Step 1: Написать падающий тест**

`src/lib/utils/offline-merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeQueuedSets } from './offline-merge'
import type { QueuedSetRecord } from './offline-queue'
import type { Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const EX_BENCH = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const EX_SQUAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function makeExercise(id: string, sets: SetEntry[] = []): ExerciseWithSets {
  return {
    id,
    name: 'Bench Press',
    name_ru: 'Жим лёжа',
    sets,
  } as unknown as ExerciseWithSets
}

function makeServerSet(exerciseId: string, setNumber: number): SetEntry {
  return {
    id: `srv_${exerciseId}_${setNumber}`,
    session_id: SESSION,
    user_id: 'u1',
    exercise_id: exerciseId,
    set_number: setNumber,
    weight_kg: 100,
    reps: 5,
    rpe: null,
    calculated_1rm: 116.7,
    rest_seconds: null,
    created_at: '2026-07-19T10:00:00.000Z',
  } as SetEntry
}

function makeQueued(
  id: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weightKg = 100,
): QueuedSetRecord {
  return {
    id,
    queuedAt: 1789000000000,
    payload: { sessionId, exerciseId, setNumber, weightKg, reps: 5 },
  }
}

describe('mergeQueuedSets', () => {
  it('возвращает исходный массив без изменений при пустой очереди', () => {
    const exercises = [makeExercise(EX_BENCH)]
    expect(mergeQueuedSets(exercises, [], [], SESSION)).toBe(exercises)
  })

  it('подмешивает сет в существующее упражнение как offline_<id>', () => {
    const exercises = [makeExercise(EX_BENCH)]
    const out = mergeQueuedSets(exercises, [], [makeQueued('q1', SESSION, EX_BENCH, 1)], SESSION)
    expect(out[0].sets).toHaveLength(1)
    expect(out[0].sets[0].id).toBe('offline_q1')
    expect(out[0].sets[0].weight_kg).toBe(100)
    expect(out[0].sets[0].calculated_1rm).not.toBeNull()
  })

  it('фильтрует записи чужих сессий', () => {
    const exercises = [makeExercise(EX_BENCH)]
    const other = makeQueued('q1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', EX_BENCH, 1)
    expect(mergeQueuedSets(exercises, [], [other], SESSION)).toBe(exercises)
  })

  it('дедуплицирует по (exerciseId, setNumber) против серверных сетов', () => {
    const exercises = [makeExercise(EX_BENCH, [makeServerSet(EX_BENCH, 1)])]
    const out = mergeQueuedSets(exercises, [], [makeQueued('q1', SESSION, EX_BENCH, 1)], SESSION)
    expect(out[0].sets).toHaveLength(1)
    expect(out[0].sets[0].id).toBe(`srv_${EX_BENCH}_1`)
  })

  it('добавляет упражнение из allExercises, если его нет в сессии', () => {
    const squat = { id: EX_SQUAT, name: 'Squat', name_ru: 'Присед' } as unknown as Exercise
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [squat],
      [makeQueued('q1', SESSION, EX_SQUAT, 1)],
      SESSION,
    )
    expect(out).toHaveLength(2)
    expect(out[1].id).toBe(EX_SQUAT)
    expect(out[1].sets[0].id).toBe('offline_q1')
  })

  it('пропускает записи с неизвестным exerciseId', () => {
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [],
      [makeQueued('q1', SESSION, EX_SQUAT, 1)],
      SESSION,
    )
    expect(out).toHaveLength(1)
    expect(out[0].sets).toHaveLength(0)
  })

  it('bodyweight (weight 0) — calculated_1rm null', () => {
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [],
      [makeQueued('q1', SESSION, EX_BENCH, 1, 0)],
      SESSION,
    )
    expect(out[0].sets[0].calculated_1rm).toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/lib/utils/offline-merge.test.ts`
Expected: FAIL — `Cannot find module './offline-merge'` (или эквивалент).

- [ ] **Step 3: Реализация**

`src/lib/utils/offline-merge.ts`:

```ts
// Merges offline-queued sets into the exercise list after a page reload.
// The cached HTML doesn't know about sets still sitting in IndexedDB —
// this rebuilds the truthful picture. Pure function, covered by tests.

import type { Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import type { QueuedSetRecord } from './offline-queue'

export function mergeQueuedSets(
  exercises: ExerciseWithSets[],
  allExercises: Exercise[],
  queued: QueuedSetRecord[],
  sessionId: string,
): ExerciseWithSets[] {
  const relevant = queued.filter((r) => r.payload.sessionId === sessionId)
  if (relevant.length === 0) return exercises

  // (exerciseId, setNumber) pairs already present server-side — a queued
  // record matching one of these was flushed between render and mount.
  const seen = new Set(
    exercises.flatMap((e) => e.sets.map((s) => `${s.exercise_id}:${s.set_number}`)),
  )

  const result = exercises.map((e) => ({ ...e, sets: [...e.sets] }))
  let changed = false

  for (const record of relevant) {
    const { exerciseId, setNumber, weightKg, reps, rpe } = record.payload
    if (seen.has(`${exerciseId}:${setNumber}`)) continue

    let target = result.find((e) => e.id === exerciseId)
    if (!target) {
      const ex = allExercises.find((e) => e.id === exerciseId)
      if (!ex) continue // unknown exercise — leave in queue, skip in UI
      target = { ...ex, sets: [] }
      result.push(target)
    }

    const synthetic: SetEntry = {
      id: `offline_${record.id}`,
      session_id: sessionId,
      user_id: '',
      exercise_id: exerciseId,
      set_number: setNumber,
      weight_kg: weightKg,
      reps,
      rpe: rpe ?? null,
      calculated_1rm: weightKg > 0 ? calculate1RM(weightKg, reps) : null,
      rest_seconds: null,
      created_at: new Date(record.queuedAt).toISOString(),
    }
    target.sets.push(synthetic)
    seen.add(`${exerciseId}:${setNumber}`)
    changed = true
  }

  return changed ? result : exercises
}
```

Примечание: форма синтетического `SetEntry` скопирована с `SetRow.tsx:190-202` — если там есть поля, которых нет в этом списке (например `is_warmup`), зеркалить SetRow, а не этот план.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/lib/utils/offline-merge.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/offline-merge.ts src/lib/utils/offline-merge.test.ts
git commit -m "feat(offline): mergeQueuedSets — merge queued sets into UI after reload"
```

---

### Task 2: finish-очередь в `offline-queue.ts` (IDB v2)

**Files:**
- Modify: `src/lib/utils/offline-queue.ts`
- Test: `src/lib/utils/offline-merge.test.ts` (добавить describe-блок `hasQueuedFinish`)

**Interfaces:**
- Consumes: существующий `openDb`/`genId` паттерн файла.
- Produces (используется в Tasks 4, 5, 6):
  - `interface QueuedFinishRecord { id: string; sessionId: string; queuedAt: number }`
  - `hasQueuedFinish(records: QueuedFinishRecord[], sessionId: string): boolean` — чистая
  - `enqueueFinish(sessionId: string): Promise<string>` — дедуп по sessionId
  - `getQueuedFinishes(): Promise<QueuedFinishRecord[]>`
  - `removeQueuedFinish(id: string): Promise<void>`

- [ ] **Step 1: Написать падающий тест**

Добавить в конец `src/lib/utils/offline-merge.test.ts`:

```ts
import { hasQueuedFinish, type QueuedFinishRecord } from './offline-queue'

describe('hasQueuedFinish', () => {
  const rec = (sessionId: string): QueuedFinishRecord => ({
    id: 'f1',
    sessionId,
    queuedAt: 1789000000000,
  })

  it('true, когда finish этой сессии в очереди', () => {
    expect(hasQueuedFinish([rec(SESSION)], SESSION)).toBe(true)
  })

  it('false для пустой очереди и чужих сессий', () => {
    expect(hasQueuedFinish([], SESSION)).toBe(false)
    expect(hasQueuedFinish([rec('dddddddd-dddd-dddd-dddd-dddddddddddd')], SESSION)).toBe(false)
  })
})
```

(импорт поставить к остальным импортам вверху файла)

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/lib/utils/offline-merge.test.ts`
Expected: FAIL — `hasQueuedFinish` не экспортируется.

- [ ] **Step 3: Реализация**

В `src/lib/utils/offline-queue.ts`:

1. Заменить шапку констант (строки 4-6):

```ts
const DB_NAME = 'trainingar-offline'
const DB_VERSION = 2
const STORE = 'set_queue'
const FINISH_STORE = 'finish_queue'
```

2. Заменить `onupgradeneeded` внутри `openDb` (обе store через `contains` — миграция v1→v2 не трогает существующую):

```ts
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FINISH_STORE)) {
        db.createObjectStore(FINISH_STORE, { keyPath: 'id' })
      }
    }
```

3. Добавить в конец файла:

```ts
// --- Finish queue: a workout finished offline waits here until online. ---

export interface QueuedFinishRecord {
  id: string
  sessionId: string
  queuedAt: number
}

/** Pure so it's testable without IndexedDB. */
export function hasQueuedFinish(records: QueuedFinishRecord[], sessionId: string): boolean {
  return records.some((r) => r.sessionId === sessionId)
}

export async function getQueuedFinishes(): Promise<QueuedFinishRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readonly')
    const req = tx.objectStore(FINISH_STORE).getAll()
    req.onsuccess = () => resolve((req.result as QueuedFinishRecord[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

/** Idempotent per session: re-queuing an already-queued finish is a no-op. */
export async function enqueueFinish(sessionId: string): Promise<string> {
  const existing = await getQueuedFinishes()
  const dup = existing.find((r) => r.sessionId === sessionId)
  if (dup) return dup.id

  const db = await openDb()
  const record: QueuedFinishRecord = { id: genId(), sessionId, queuedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readwrite')
    tx.objectStore(FINISH_STORE).put(record)
    tx.oncomplete = () => resolve(record.id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeQueuedFinish(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readwrite')
    tx.objectStore(FINISH_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

- [ ] **Step 4: Тесты + typecheck**

Run: `npx vitest run src/lib/utils/offline-merge.test.ts` → PASS (9 tests)
Run: `npx tsc --noEmit` → чисто

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/offline-queue.ts src/lib/utils/offline-merge.test.ts
git commit -m "feat(offline): finish_queue store (IDB v2) + enqueue/get/remove API"
```

---

### Task 3: endpoint `POST /api/workouts/finish-queue`

**Files:**
- Create: `src/app/api/workouts/finish-queue/route.ts`

**Interfaces:**
- Consumes: `verifySession` (`@/lib/dal`), `createClient` (`@/lib/supabase/server`), `getSession`/`finishSession` (`@/lib/db/workouts`), `getSetsForSession` (`@/lib/db/sets`), `validateUuid`/`ValidationError` (`@/lib/utils/validators`).
- Produces: `POST { sessionId } → 200 { ok: true }` (идемпотентно) | `400` | `404`. Используется в Task 5.

- [ ] **Step 1: Реализация** (route-хендлеры в проекте не покрыты юнит-тестами — паттерн `/api/sets/queue`; проверка typecheck + ручная)

`src/app/api/workouts/finish-queue/route.ts`:

```ts
// POST endpoint used by OfflineSyncWatcher to flush a workout finished
// offline. Mirrors finishWorkoutAction (recompute tonnage from sets, then
// finishSession) but is idempotent: flushing an already-finished session
// returns ok so retries never wedge the queue.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getSession, finishSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { ValidationError, validateUuid } from '@/lib/utils/validators'

export const dynamic = 'force-dynamic'

interface QueuedFinishBody {
  sessionId: string
}

export async function POST(request: Request) {
  const { user } = await verifySession()
  const supabase = await createClient()

  let body: QueuedFinishBody
  try {
    body = (await request.json()) as QueuedFinishBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let sessionId: string
  try {
    sessionId = validateUuid(body.sessionId, 'sessionId')
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (session.finished_at) {
    return NextResponse.json({ ok: true, alreadyFinished: true })
  }

  // Same tonnage math as finishWorkoutAction — by flush time the queued
  // sets have already landed (watcher drains sets before finishes).
  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets
    .filter((s) => !s.is_warmup)
    .reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Проверка**

Run: `npx tsc --noEmit` → чисто
Run: `npx eslint src/app/api/workouts/finish-queue/route.ts` → чисто

- [ ] **Step 3: Commit**

```bash
git add src/app/api/workouts/finish-queue/route.ts
git commit -m "feat(offline): idempotent finish-queue endpoint"
```

---

### Task 4: офлайн-ветка в `FinishWorkoutButton` + баннер в `WorkoutClient` + i18n

**Files:**
- Modify: `src/components/workout/FinishWorkoutButton.tsx` (весь файл, 36 строк)
- Modify: `src/components/workout/WorkoutClient.tsx` (стейт `finishQueued`, баннер, проп)
- Modify: `messages/ru.json`, `messages/en.json` (блок `"offline"`, ru ~строка 321)

**Interfaces:**
- Consumes: `enqueueFinish` из Task 2.
- Produces: проп `onQueued?: () => void` у `FinishWorkoutButton`; стейт `finishQueued` + сеттер `setFinishQueued` в `WorkoutClient` (Task 6 переиспользует `setFinishQueued`).

- [ ] **Step 1: Переписать `FinishWorkoutButton.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { finishWorkoutAction } from '@/app/(app)/workout/[id]/actions'
import { enqueueFinish } from '@/lib/utils/offline-queue'

interface Props {
  sessionId: string
  /** Called when the finish couldn't reach the server and was queued instead. */
  onQueued?: () => void
}

// Same offline heuristic as SetRow: navigator.onLine is authoritative when
// false; a TypeError mentioning fetch/network catches flaky radio. A server
// action's redirect() is handled by Next internally and never lands here.
function isOfflineError(err: unknown): boolean {
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    (err instanceof TypeError && /fetch|network/i.test(err.message))
  )
}

export function FinishWorkoutButton({ sessionId, onQueued }: Props) {
  const t = useTranslations('workout')
  const [isPending, startTransition] = useTransition()

  function handleFinish() {
    startTransition(async () => {
      try {
        await finishWorkoutAction(sessionId)
      } catch (err) {
        if (!isOfflineError(err)) throw err
        await enqueueFinish(sessionId)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('formly:set-queued'))
        }
        onQueued?.()
      }
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
      {isPending ? t('finishing') : t('finish')}
    </Button>
  )
}
```

- [ ] **Step 2: Стейт и баннер в `WorkoutClient.tsx`**

1. К стейтам (после строки 49 `const [prCelebration, ...]`):

```tsx
  const [finishQueued, setFinishQueued] = useState(false)
```

2. Заменить `<FinishWorkoutButton sessionId={session.id} />` (строка ~179):

```tsx
          <FinishWorkoutButton sessionId={session.id} onQueued={() => setFinishQueued(true)} />
```

3. Импорт `useTranslations` уже есть (`t = useTranslations('workout')`); добавить рядом:

```tsx
  const tOffline = useTranslations('offline')
```

4. Баннер — вставить сразу после закрывающего `</header>` (строка ~181):

```tsx
      {finishQueued && (
        <div
          className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(43, 216, 132, 0.10)',
            border: '1px solid rgba(43, 216, 132, 0.32)',
            color: 'var(--tar-success)',
            font: '600 13px/1.4 var(--tar-text)',
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          {tOffline('finishQueued')}
        </div>
      )}
```

Импорт `CheckCircle` добавить к lucide-импортам WorkoutClient, если его там нет.

- [ ] **Step 3: i18n-ключи**

`messages/ru.json`, блок `"offline"`:

```json
    "finishQueued": "Тренировка завершена — синхронизируется, когда появится сеть",
```

`messages/en.json`, блок `"offline"`:

```json
    "finishQueued": "Workout finished — will sync when you're back online",
```

- [ ] **Step 4: Проверка**

Run: `npx tsc --noEmit` → чисто
Run: `npx eslint src/components/workout/FinishWorkoutButton.tsx src/components/workout/WorkoutClient.tsx` → чисто

- [ ] **Step 5: Commit**

```bash
git add src/components/workout/FinishWorkoutButton.tsx src/components/workout/WorkoutClient.tsx messages/ru.json messages/en.json
git commit -m "feat(offline): queue workout finish when offline + pending-sync banner"
```

---

### Task 5: `OfflineSyncWatcher` — слив finish после сетов

**Files:**
- Modify: `src/components/workout/OfflineSyncWatcher.tsx`

**Interfaces:**
- Consumes: `getQueuedFinishes`, `removeQueuedFinish`, `QueuedFinishRecord` из Task 2; endpoint из Task 3.
- Produces: ничего нового наружу; порядок слива «все сеты → затем finishes» — инвариант, на который опирается пересчёт тоннажа на сервере.

- [ ] **Step 1: Реализация**

1. Заменить импорт очереди (строка 7):

```ts
import {
  getQueuedSets,
  removeQueuedSet,
  getQueuedFinishes,
  removeQueuedFinish,
  type QueuedSetRecord,
  type QueuedFinishRecord,
} from '@/lib/utils/offline-queue'
```

2. После `flushOne` добавить:

```ts
async function flushFinish(record: QueuedFinishRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/workouts/finish-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: record.sessionId }),
    })
    if (!res.ok) return false
    await removeQueuedFinish(record.id)
    return true
  } catch {
    return false
  }
}
```

3. Заменить `drainQueue` целиком (сеты строго до finishes — сервер пересчитывает тоннаж из сетов):

```ts
async function drainQueue(): Promise<number> {
  let drained = 0

  const queuedSets = await getQueuedSets()
  for (const record of queuedSets) {
    const ok = await flushOne(record)
    if (!ok) return drained
    drained++
  }

  // Finishes only after ALL sets are on the server, so the recomputed
  // tonnage sees the complete session.
  const queuedFinishes = await getQueuedFinishes()
  for (const record of queuedFinishes) {
    const ok = await flushFinish(record)
    if (!ok) return drained
    drained++
  }

  return drained
}
```

4. В `refresh()` и `tryDrain()` считать оба хвоста. Заменить тело `refresh`:

```ts
      try {
        const [sets, finishes] = await Promise.all([getQueuedSets(), getQueuedFinishes()])
        setPendingCount(sets.length + finishes.length)
      } catch {
        // IDB unavailable (private mode in old Safari etc.) — silently ignore
      }
```

и в `tryDrain` заменить две строки после `drainQueue()`:

```ts
        const [sets, finishes] = await Promise.all([getQueuedSets(), getQueuedFinishes()])
        const remainingCount = sets.length + finishes.length
        setPendingCount(remainingCount)
        if (drained > 0 && remainingCount === 0) {
          router.refresh()
        }
```

(`router.refresh()` после полного слива приводит к серверному редиректу на `/history/<id>` — страница завершённой сессии редиректит сама, `workout/[id]/page.tsx:27`.)

- [ ] **Step 2: Проверка**

Run: `npx tsc --noEmit` → чисто
Run: `npx eslint src/components/workout/OfflineSyncWatcher.tsx` → чисто

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/OfflineSyncWatcher.tsx
git commit -m "feat(offline): drain queued finishes after sets"
```

---

### Task 6: merge очереди в `WorkoutClient` при монтировании

**Files:**
- Modify: `src/components/workout/WorkoutClient.tsx`

**Interfaces:**
- Consumes: `mergeQueuedSets` (Task 1), `getQueuedSets`, `getQueuedFinishes`, `hasQueuedFinish` (Task 2), `setFinishQueued` (Task 4), проп `allExercises` (уже в `Props`, но не деструктурирован — добавить).

- [ ] **Step 1: Реализация**

1. Импорты:

```tsx
import { useEffect } from 'react' // добавить к существующему импорту react
import { getQueuedSets, getQueuedFinishes, hasQueuedFinish } from '@/lib/utils/offline-queue'
import { mergeQueuedSets } from '@/lib/utils/offline-merge'
```

2. Деструктурировать `allExercises` в параметрах компонента (строка ~36, рядом с `initialExercises`):

```tsx
export function WorkoutClient({
  session,
  initialExercises,
  allExercises,
  ...
```

3. Эффект — после объявления стейтов (`finishQueued` из Task 4 уже есть):

```tsx
  // After an offline reload the cached HTML doesn't include sets still in
  // IndexedDB — merge them in so the screen tells the truth. Runs once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [queuedSets, queuedFinishes] = await Promise.all([
          getQueuedSets(),
          getQueuedFinishes(),
        ])
        if (cancelled) return
        if (queuedSets.length > 0) {
          setExercises((prev) => mergeQueuedSets(prev, allExercises, queuedSets, session.id))
        }
        if (hasQueuedFinish(queuedFinishes, session.id)) {
          setFinishQueued(true)
        }
      } catch {
        // IDB unavailable — offline features silently off
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sync with IDB
  }, [])
```

- [ ] **Step 2: Проверка**

Run: `npx tsc --noEmit` → чисто
Run: `npx eslint src/components/workout/WorkoutClient.tsx` → чисто (если правило `react-hooks/set-state-in-effect` ругается на async-setState — обернуть по образцу `RestTimer.tsx:115-119` c `eslint-disable`-комментарием и пояснением)
Run: `npx vitest run` → все существующие + новые тесты PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/WorkoutClient.tsx
git commit -m "feat(offline): merge queued sets into UI on mount"
```

---

### Task 7: страница `/offline`

**Files:**
- Create: `src/app/offline/page.tsx`
- Modify: `messages/ru.json`, `messages/en.json` (блок `"offline"`)

**Interfaces:**
- Produces: статичный маршрут `/offline` (без auth, вне групп `(app)`/`(auth)`) — прекэшируется и отдаётся Service Worker'ом в Task 8.

- [ ] **Step 1: Реализация**

`src/app/offline/page.tsx`:

```tsx
'use client'

// Offline fallback page. Precached by the service worker at install time and
// served for failed navigations (see public/sw.js). No auth on purpose: it
// must render from cache without any server roundtrip.

import { useTranslations } from 'next-intl'
import { CloudOff } from 'lucide-react'

export default function OfflinePage() {
  const t = useTranslations('offline')
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        background: 'var(--tar-bg, #0a0a0f)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--tar-line, rgba(255,255,255,0.08))',
          marginBottom: 18,
        }}
      >
        <CloudOff style={{ width: 28, height: 28, color: 'var(--tar-ink-dim, #a0a0b0)' }} />
      </div>
      <h1
        style={{
          font: '800 22px/1.2 var(--tar-display, inherit)',
          color: 'var(--tar-ink, #fff)',
          marginBottom: 10,
        }}
      >
        {t('pageTitle')}
      </h1>
      <p
        style={{
          font: '500 14px/1.5 var(--tar-text, inherit)',
          color: 'var(--tar-ink-dim, #a0a0b0)',
          maxWidth: 340,
          marginBottom: 24,
        }}
      >
        {t('pageSub')}
      </p>
      <button type="button" className="tar-cta" onClick={() => window.location.reload()}>
        {t('retry')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: i18n-ключи**

`messages/ru.json`, блок `"offline"`:

```json
    "pageTitle": "Нет сети",
    "pageSub": "Твои данные в безопасности: всё записанное лежит в очереди и синхронизируется, как только появится интернет.",
    "retry": "Повторить",
```

`messages/en.json`, блок `"offline"`:

```json
    "pageTitle": "You're offline",
    "pageSub": "Your data is safe: everything you logged is queued and will sync as soon as you're back online.",
    "retry": "Retry",
```

- [ ] **Step 3: Проверка**

Run: `npx tsc --noEmit` → чисто
Run: `npx eslint src/app/offline/page.tsx` → чисто
Run: `npm run dev` (или уже запущенный dev) → открыть `http://localhost:3000/offline` → страница рендерится без редиректа на login.

- [ ] **Step 4: Commit**

```bash
git add src/app/offline/page.tsx messages/ru.json messages/en.json
git commit -m "feat(offline): /offline fallback page"
```

---

### Task 8: кэширование в `public/sw.js`

**Files:**
- Modify: `public/sw.js` (заменить строки 1-11: шапка, install, activate, пустой fetch; остальное — push/rest-timer/notificationclick — НЕ трогать)

**Interfaces:**
- Consumes: маршрут `/offline` из Task 7.
- Produces: офлайн-выживаемость `/workout/<uuid>` и фолбэк остальных навигаций.

- [ ] **Step 1: Реализация**

Заменить строки 1-11 `public/sw.js` на:

```js
// Service worker: PWA installability, web-push notifications, and offline
// caching. Caching scope (spec: docs/superpowers/specs/2026-07-19-offline-
// workout-design.md):
//   - static assets (hashed, immutable) → cache-first
//   - /workout/<uuid> document navigations → network-first, cache fallback
//   - other navigations → network, /offline fallback
//   - RSC payloads, /api/*, POST, cross-origin → untouched

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `tar-static-${CACHE_VERSION}`
const PAGES_CACHE = `tar-pages-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'
const WORKOUT_RE = /^\/workout\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const NETWORK_TIMEOUT_MS = 3500

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  )
})

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest')
  )
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstWorkout(request) {
  const cache = await caches.open(PAGES_CACHE)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    clearTimeout(timer)
    // ignoreSearch: the workout URL may carry ?template=… — same page.
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached) return cached
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

async function networkWithOfflineFallback(request) {
  try {
    return await fetch(request)
  } catch (err) {
    const cache = await caches.open(PAGES_CACHE)
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // RSC payloads poison the client router if served stale — never cache.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return
  if (url.pathname.startsWith('/api/')) return

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    if (WORKOUT_RE.test(url.pathname)) {
      event.respondWith(networkFirstWorkout(request))
    } else {
      event.respondWith(networkWithOfflineFallback(request))
    }
  }
})
```

Всё ниже (`// Web Push: incoming notifications` и далее) остаётся без изменений.

- [ ] **Step 2: Проверка**

Run: `npx eslint public/sw.js` → если файл вне eslint-скоупа, пропустить.
Run: `npm run build` с плейсхолдерами env (репо без `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" npm run build
```

Expected: сборка успешна, `/offline` в списке статичных маршрутов (`○ /offline`).

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat(offline): SW runtime caching — workout survives reload offline"
```

---

### Task 9: финальная верификация

**Files:** нет новых.

- [ ] **Step 1: Полный прогон**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" npm run build
```

Expected: всё зелёное, тестов ≥ 79 (70 существующих + 9 новых).

- [ ] **Step 2: Ручной чеклист (нужен реальный `.env.local`; выполняет пользователь или сессия с доступом к Supabase)**

DevTools → Application → Service Workers → Update; затем Network → Offline:

1. Открыть активную тренировку онлайн → выключить сеть → перезагрузить страницу → экран рендерится из кэша.
2. Офлайн: залогировать сет → появился `offline_*` сет + пилюля очереди → перезагрузить → сет всё ещё виден (merge).
3. Офлайн: нажать «Завершить» → баннер «синхронизируется» → включить сеть → автослив → `router.refresh()` → редирект на history, тоннаж корректный.
4. Офлайн: перейти на `/dashboard` → заглушка `/offline` с кнопкой «Повторить».
5. Повторный слив finish (двойной клик/ретрай) → не ошибка (идемпотентность).

- [ ] **Step 3: Commit (если были правки по результатам)**

```bash
git add -A
git commit -m "fix(offline): adjustments after manual verification"
```
