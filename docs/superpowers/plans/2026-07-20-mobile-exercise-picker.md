# Mobile Exercise Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped inline exercise search on the workout page with a full-screen mobile picker: instant local filtering, muscle chips, recent exercises, AI fallback.

**Architecture:** Pure filtering logic in `src/lib/utils/exercise-filter.ts` (TDD). New `ExercisePicker` client component renders a full-screen overlay fed by the already-client-side `allExercises`; the existing `suggestExercisesAction` powers the AI fallback. Old `ExerciseSearch` is deleted.

**Tech Stack:** React 19, Tailwind, next-intl, vitest.

**Spec:** `docs/superpowers/specs/2026-07-20-mobile-exercise-picker-design.md`

## Global Constraints

- Branch `feat/mobile-exercise-picker`, based on `feat/exercise-db-ai-search` (stacked on PR #14).
- No new dependencies. No list virtualization — `content-visibility: auto`.
- RU copy: «+ Упражнение», «Недавние», «Все упражнения», «Добавлено», chips «Все/Грудь/Спина/Плечи/Бицепс/Трицепс/Ноги/Пресс/Прочее».
- All gates green per task: `npx vitest run`, `npx tsc --noEmit`, `npx eslint src`.

---

### Task 1: `exercise-filter.ts` pure functions (TDD)

**Files:** Create `src/lib/utils/exercise-filter.ts`, `src/lib/utils/exercise-filter.test.ts`.

**Produces (Task 2 consumes):** `MuscleChip` union (`'all' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'other'`), `MUSCLE_CHIPS: MuscleChip[]`, `CHIP_MUSCLES`, `normalizeQuery(s)`, `matchesChip(ex, chip)`, `filterExercises(all, query, chip, limit=50)`.

- [ ] Tests first (fail: module not found), then implementation:

```ts
// src/lib/utils/exercise-filter.ts
import type { Exercise, MuscleGroup } from '@/lib/types/models'

export type MuscleChip =
  | 'all' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'other'

export const CHIP_MUSCLES: Record<Exclude<MuscleChip, 'all'>, MuscleGroup[]> = {
  chest: ['chest'],
  back: ['back', 'lats', 'traps'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
  other: ['forearms', 'cardio'],
}

export const MUSCLE_CHIPS: MuscleChip[] = [
  'all', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'other',
]

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim()
}

export function matchesChip(ex: Exercise, chip: MuscleChip): boolean {
  if (chip === 'all') return true
  return CHIP_MUSCLES[chip].includes(ex.primary_muscle)
}

// Instant local search over the client-side catalog. Prefix matches (name,
// name_ru or alias) rank above substring matches; both respect the chip.
export function filterExercises(
  all: Exercise[],
  query: string,
  chip: MuscleChip,
  limit = 50,
): Exercise[] {
  const q = normalizeQuery(query)
  if (q.length < 2) return []
  const starts: Exercise[] = []
  const contains: Exercise[] = []
  for (const ex of all) {
    if (!matchesChip(ex, chip)) continue
    const names = [ex.name, ex.name_ru ?? ''].map(normalizeQuery)
    const aliases = (ex.aliases ?? []).map(normalizeQuery)
    if (names.some((n) => n.startsWith(q)) || aliases.some((a) => a.startsWith(q))) {
      starts.push(ex)
    } else if (names.some((n) => n.includes(q)) || aliases.some((a) => a.includes(q))) {
      contains.push(ex)
    }
  }
  return [...starts, ...contains].slice(0, limit)
}
```

Test cases (build `Exercise` stubs with a helper): «ЖИМ ЛЕЖА» finds `name_ru: 'Жим лёжа'` (case + ё); alias «гакк» finds Hack Squat; prefix «жим» ranks «Жим лёжа» above «Армейский жим»; chip `legs` drops chest exercises; `matchesChip` all/true, chest/chest true, chest/back false; limit slices; single char → [].

- [ ] `npx vitest run src/lib/utils/exercise-filter.test.ts` → PASS; commit `feat(picker): local exercise filtering with muscle chips`.

---

### Task 2: `ExercisePicker` component + integration + i18n

**Files:** Create `src/components/workout/ExercisePicker.tsx`; modify `src/components/workout/WorkoutClient.tsx` (swap `ExerciseSearch` → `ExercisePicker`), `messages/ru.json` + `messages/en.json` (workout block); delete `src/components/workout/ExerciseSearch.tsx`.

**Consumes:** Task 1 exports; `suggestExercisesAction`, `ExerciseSuggestion` from `@/app/(app)/workout/[id]/actions`; `ExerciseForm`.

Component contract:

```tsx
interface Props {
  allExercises: Exercise[]
  recentExercises: Exercise[]
  sessionExerciseIds: string[]
  onSelect: (exercise: Exercise) => void
}
```

Key behaviors (full code lives in the component, structure fixed):

- Closed state renders `<button className="tar-cta w-full">+ {t('addExercise')}</button>`.
- Open: `fixed inset-0 z-50` column; body scroll lock via `useEffect` (`document.body.style.overflow`); Escape closes.
- Header row: ✕ button + `<Input autoFocus>`; chips row `overflow-x-auto`; content `flex-1 overflow-y-auto overscroll-contain`.
- Browse mode (query < 2): «Недавние» from `recentExercises` (chip-filtered, minus `sessionExerciseIds`), then «Все упражнения» — `useMemo` sort by locale display name; every row `style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}`.
- Search mode: `filterExercises(allExercises, query, chip)`; empty → AI block (spinner «ИИ подбирает варианты…» / cards «Возможно, вы имели в виду…») + create-custom CTA opening `ExerciseForm` (same props as old ExerciseSearch: `prefilledName`, `defaultOpen`, `onDismiss`, `onCreated` → select + close).
- AI effect: identical guards to the old ExerciseSearch (`aiAskedFor` ref, 800 ms debounce, `navigator.onLine`, once per query), triggered when search-mode results are empty.
- Added-to-session rows: `disabled`, `opacity-50`, Check icon, label `t('added')`.
- Selecting: `onSelect(ex)`, reset query/AI state, close.

i18n `workout.*` additions — ru: `addExercise: "Упражнение"`, `recent: "Недавние"`, `allExercisesSection: "Все упражнения"`, `added: "Добавлено"`, `chipAll: "Все"`, `chipChest: "Грудь"`, `chipBack: "Спина"`, `chipShoulders: "Плечи"`, `chipBiceps: "Бицепс"`, `chipTriceps: "Трицепс"`, `chipLegs: "Ноги"`, `chipCore: "Пресс"`, `chipOther: "Прочее"`; en: `Exercise / Recent / All exercises / Added / All / Chest / Back / Shoulders / Biceps / Triceps / Legs / Core / Other`.

WorkoutClient: replace the sticky-bar `<ExerciseSearch onSelect={addExercise} />` with

```tsx
<ExercisePicker
  allExercises={allExercises}
  recentExercises={suggestedExercises}
  sessionExerciseIds={exercises.map((e) => e.id)}
  onSelect={addExercise}
/>
```

(`allExercises` is already in Props; ensure it is destructured.)

- [ ] Implement, delete `ExerciseSearch.tsx`, run `npx vitest run && npx tsc --noEmit && npx eslint src` → clean; commit `feat(picker): full-screen mobile exercise picker`.

---

### Task 3: Final gate + ship

- [ ] `NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" npm run build` → success.
- [ ] Push `feat/mobile-exercise-picker`; `gh pr create --base feat/exercise-db-ai-search` (stacked; note the manual mobile checklist from the spec in the body).
