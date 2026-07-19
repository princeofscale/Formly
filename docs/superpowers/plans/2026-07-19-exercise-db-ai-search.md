# Exercise DB Expansion + AI Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import ~800 exercises from free-exercise-db with Russian names and slang aliases, add pg_trgm fuzzy search, and an AI "Возможно, вы имели в виду…" fallback in the workout exercise search.

**Architecture:** A one-off generator script turns the free-exercise-db JSON + a committed RU-translations file into a SQL migration (dedup happens in SQL via `where not exists`). Search gets a pg_trgm RPC fallback for typos. A new Mistral service picks up to 3 exercises from a numbered catalog (index-based, hallucination-proof), exposed via a server action and auto-triggered in `ExerciseSearch` when results are empty.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), Mistral (`mistral-large-latest`), vitest, tsx (devDep, script runner only).

**Spec:** `docs/superpowers/specs/2026-07-19-exercise-db-ai-search-design.md`

## Global Constraints

- Branch: `feat/exercise-db-ai-search` from `main`.
- No new runtime dependencies. `tsx` is allowed as devDependency (runs the one-off import script).
- Source: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` (public domain). Images: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<path>`.
- Skip source categories `stretching` and `cardio`.
- DB facts: `exercises.slug` is `text unique`; `mechanic` is `text` with a check constraint (NOT an enum); `primary_muscle` is enum `muscle_group`; `equipment` is enum `equipment_type`; `secondary_muscles` is `muscle_group[]`; `aliases` is `text[]`; `image_urls` is `text[]`. RLS: select allowed for `is_custom = false or created_by = auth.uid()`.
- TS `MuscleGroup` does NOT include `'shoulders'` (DB enum does). Map source `shoulders` → `'side_delts'`.
- AI quota: new kind `exercise_suggest`, 30/day (`ai_call_log.kind` is plain text — no DB migration needed).
- UI copy: RU «ИИ подбирает варианты…» / «Возможно, вы имели в виду…»; EN "AI is thinking…" / "Did you mean…".
- Every task ends with tests green: `npx vitest run` (79 passing before this plan).

---

### Task 1: Import mapping pure functions

**Files:**

- Create: `src/lib/utils/exercise-import.ts`
- Test: `src/lib/utils/exercise-import.test.ts`

**Interfaces:**

- Consumes: `MuscleGroup`, `Equipment`, `Mechanic` from `@/lib/types/models`.
- Produces (used by Task 2): `SourceExercise`, `RuEntry`, `ImportedRow`, `isImportable(src)`, `toImportedRow(src, ru)`, `rowToSqlValues(row)`, `sqlQuote(s)`, `sqlTextArray(items)`, `slugify(name)`, `mapMuscle`, `mapEquipment`, `mapMechanic`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/utils/exercise-import.test.ts
import { describe, it, expect } from 'vitest'
import {
  mapMuscle,
  mapEquipment,
  mapMechanic,
  slugify,
  sqlQuote,
  sqlTextArray,
  isImportable,
  toImportedRow,
  type SourceExercise,
} from './exercise-import'

function src(overrides: Partial<SourceExercise> = {}): SourceExercise {
  return {
    name: 'Barbell Bench Press',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'strength',
    instructions: ['Lie on the bench.', 'Press up.'],
    images: ['Barbell_Bench_Press/0.jpg', 'Barbell_Bench_Press/1.jpg'],
    ...overrides,
  }
}

describe('mapMuscle', () => {
  it('maps known source muscles to our enum', () => {
    expect(mapMuscle('abdominals')).toBe('core')
    expect(mapMuscle('quadriceps')).toBe('quads')
    expect(mapMuscle('lower back')).toBe('back')
    expect(mapMuscle('shoulders')).toBe('side_delts')
  })

  it('returns null for unknown muscles', () => {
    expect(mapMuscle('tongue')).toBeNull()
  })
})

describe('mapEquipment', () => {
  it('maps known equipment', () => {
    expect(mapEquipment('body only')).toBe('bodyweight')
    expect(mapEquipment('e-z curl bar')).toBe('ez_bar')
    expect(mapEquipment('kettlebells')).toBe('kettlebell')
  })

  it('falls back to other for unknown/null', () => {
    expect(mapEquipment('medicine ball')).toBe('other')
    expect(mapEquipment(null)).toBe('other')
  })
})

describe('mapMechanic', () => {
  it('keeps isolation, defaults everything else to compound', () => {
    expect(mapMechanic('isolation')).toBe('isolation')
    expect(mapMechanic('compound')).toBe('compound')
    expect(mapMechanic(null)).toBe('compound')
  })
})

describe('slugify', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugify('Barbell Bench Press')).toBe('barbell-bench-press')
    expect(slugify('3/4 Sit-Up')).toBe('3-4-sit-up')
    expect(slugify("Farmer's Walk")).toBe('farmer-s-walk')
  })
})

describe('sqlQuote / sqlTextArray', () => {
  it('escapes single quotes', () => {
    expect(sqlQuote("Farmer's Walk")).toBe("'Farmer''s Walk'")
  })

  it('renders empty and non-empty text arrays', () => {
    expect(sqlTextArray([])).toBe("'{}'::text[]")
    expect(sqlTextArray(["a'b", 'c'])).toBe("array['a''b','c']::text[]")
  })
})

describe('isImportable', () => {
  it('accepts strength exercises with mappable primary muscle', () => {
    expect(isImportable(src())).toBe(true)
  })

  it('rejects skipped categories and unmappable primaries', () => {
    expect(isImportable(src({ category: 'stretching' }))).toBe(false)
    expect(isImportable(src({ category: 'cardio' }))).toBe(false)
    expect(isImportable(src({ primaryMuscles: ['tongue'] }))).toBe(false)
  })
})

describe('toImportedRow', () => {
  it('maps a full row with RU data', () => {
    const row = toImportedRow(src(), {
      name_ru: 'Жим штанги лёжа',
      aliases: ['Бенч ', 'жим лежа'],
    })
    expect(row.slug).toBe('barbell-bench-press')
    expect(row.primary_muscle).toBe('chest')
    expect(row.secondary_muscles).toEqual(['triceps', 'side_delts'])
    expect(row.name_ru).toBe('Жим штанги лёжа')
    expect(row.aliases).toEqual(['бенч', 'жим лежа'])
    expect(row.instructions_en).toBe('Lie on the bench.\nPress up.')
    expect(row.image_urls[0]).toBe(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    )
  })

  it('honors primary_muscle override and drops secondary equal to primary', () => {
    const row = toImportedRow(src({ secondaryMuscles: ['chest', 'triceps'] }), {
      name_ru: 'Жим',
      primary_muscle: 'chest',
    })
    expect(row.primary_muscle).toBe('chest')
    expect(row.secondary_muscles).toEqual(['triceps'])
  })

  it('deduplicates secondary muscles that map to the same value', () => {
    const row = toImportedRow(src({ secondaryMuscles: ['lower back', 'middle back'] }), {
      name_ru: 'Жим',
    })
    expect(row.secondary_muscles).toEqual(['back'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/utils/exercise-import.test.ts`
Expected: FAIL — cannot resolve `./exercise-import`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/utils/exercise-import.ts
// Pure mapping logic for the one-off free-exercise-db import
// (scripts/import-free-exercise-db.ts). Kept here so vitest covers it.
import type { Equipment, Mechanic, MuscleGroup } from '@/lib/types/models'

export interface SourceExercise {
  name: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  category: string
  instructions: string[]
  images: string[]
}

export interface RuEntry {
  name_ru: string
  aliases?: string[]
  primary_muscle?: MuscleGroup
}

export interface ImportedRow {
  name: string
  slug: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  mechanic: Mechanic
  equipment: Equipment
  name_ru: string
  aliases: string[]
  instructions_en: string | null
  image_urls: string[]
}

export const SKIPPED_CATEGORIES = new Set(['stretching', 'cardio'])

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  abdominals: 'core',
  abductors: 'glutes',
  adductors: 'quads',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'lats',
  'lower back': 'back',
  'middle back': 'back',
  neck: 'traps',
  quadriceps: 'quads',
  shoulders: 'side_delts',
  traps: 'traps',
  triceps: 'triceps',
}

const EQUIPMENT_MAP: Record<string, Equipment> = {
  'body only': 'bodyweight',
  machine: 'machine',
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  kettlebells: 'kettlebell',
  bands: 'band',
  'e-z curl bar': 'ez_bar',
  'medicine ball': 'other',
  'exercise ball': 'other',
  'foam roll': 'other',
}

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

export function mapMuscle(m: string): MuscleGroup | null {
  return MUSCLE_MAP[m] ?? null
}

export function mapEquipment(e: string | null): Equipment {
  return (e && EQUIPMENT_MAP[e]) || 'other'
}

export function mapMechanic(m: string | null): Mechanic {
  return m === 'isolation' ? 'isolation' : 'compound'
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isImportable(srcExercise: SourceExercise): boolean {
  if (SKIPPED_CATEGORIES.has(srcExercise.category)) return false
  return mapMuscle(srcExercise.primaryMuscles[0] ?? '') !== null
}

export function toImportedRow(srcExercise: SourceExercise, ru: RuEntry): ImportedRow {
  const primary = ru.primary_muscle ?? mapMuscle(srcExercise.primaryMuscles[0] ?? '')!
  const secondary = [
    ...new Set(
      srcExercise.secondaryMuscles
        .map(mapMuscle)
        .filter((m): m is MuscleGroup => m !== null && m !== primary),
    ),
  ]
  return {
    name: srcExercise.name,
    slug: slugify(srcExercise.name),
    primary_muscle: primary,
    secondary_muscles: secondary,
    mechanic: mapMechanic(srcExercise.mechanic),
    equipment: mapEquipment(srcExercise.equipment),
    name_ru: ru.name_ru,
    aliases: (ru.aliases ?? []).map((a) => a.toLowerCase().trim()).filter(Boolean),
    instructions_en:
      srcExercise.instructions.length > 0 ? srcExercise.instructions.join('\n') : null,
    image_urls: srcExercise.images.map((img) => IMAGE_BASE + img),
  }
}

export function sqlQuote(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'"
}

export function sqlTextArray(items: string[]): string {
  if (items.length === 0) return "'{}'::text[]"
  return 'array[' + items.map(sqlQuote).join(',') + ']::text[]'
}

export function rowToSqlValues(row: ImportedRow): string {
  return [
    '(',
    [
      sqlQuote(row.name),
      sqlQuote(row.slug),
      sqlQuote(row.primary_muscle),
      sqlTextArray(row.secondary_muscles),
      sqlQuote(row.mechanic),
      sqlQuote(row.equipment),
      sqlQuote(row.name_ru),
      sqlTextArray(row.aliases),
      row.instructions_en === null ? 'null' : sqlQuote(row.instructions_en),
      sqlTextArray(row.image_urls),
    ].join(', '),
    ')',
  ].join('')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/utils/exercise-import.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/exercise-import.ts src/lib/utils/exercise-import.test.ts
git commit -m "feat(exercises): pure mapping functions for free-exercise-db import"
```

---

### Task 2: Import generator script

**Files:**

- Create: `scripts/import-free-exercise-db.ts`
- Modify: `package.json` (devDep `tsx`)

**Interfaces:**

- Consumes: everything from Task 1 via relative import `../src/lib/utils/exercise-import`.
- Produces: migration file `supabase/migrations/20260719120000_import_free_exercise_db.sql` (generated in Task 3 once RU data exists). Reads `scripts/data/exercise-ru.json` (authored in Task 3).

- [ ] **Step 1: Install tsx**

Run: `npm install -D tsx`

- [ ] **Step 2: Write the script**

```ts
// scripts/import-free-exercise-db.ts
// One-off generator: downloads free-exercise-db, merges RU names/aliases from
// scripts/data/exercise-ru.json, writes a SQL migration. Dedup against rows
// already in the DB happens inside the generated SQL (where not exists), so
// this script needs no DB access. Run: npx tsx scripts/import-free-exercise-db.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isImportable,
  rowToSqlValues,
  sqlQuote,
  sqlTextArray,
  toImportedRow,
  type RuEntry,
  type SourceExercise,
} from '../src/lib/utils/exercise-import'

const SOURCE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const here = dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = join(
  here,
  '..',
  'supabase',
  'migrations',
  '20260719120000_import_free_exercise_db.sql',
)
const RU_PATH = join(here, 'data', 'exercise-ru.json')

async function main() {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
  const all = (await res.json()) as SourceExercise[]
  const ru = JSON.parse(readFileSync(RU_PATH, 'utf8')) as Record<string, RuEntry>

  const importable = all.filter(isImportable)
  const missing = importable.filter((e) => !ru[e.name]).map((e) => e.name)
  if (missing.length > 0) {
    console.error(`Missing RU entries: ${missing.length}`)
    for (const name of missing.sort()) console.error('  ' + name)
    process.exit(1)
  }

  const rows = importable.map((e) => toImportedRow(e, ru[e.name]))
  const values = rows.map(rowToSqlValues).join(',\n')
  const backfill = rows
    .filter((r) => r.image_urls.length > 0)
    .map((r) => `(${sqlQuote(r.name)}, ${sqlTextArray(r.image_urls)})`)
    .join(',\n')

  const sql = `-- Generated by scripts/import-free-exercise-db.ts — do not edit by hand.
-- Source: free-exercise-db (public domain). ${rows.length} exercises after
-- filtering (categories stretching/cardio and unmappable muscles skipped).
-- Dedup: rows matching an existing built-in exercise by name or slug are
-- skipped; their photos are backfilled onto the existing row below.

insert into exercises
  (name, slug, primary_muscle, secondary_muscles, mechanic, equipment,
   is_custom, created_by, name_ru, aliases, instructions_en, image_urls)
select
  v.name, v.slug, v.primary_muscle::muscle_group,
  v.secondary_muscles::muscle_group[], v.mechanic, v.equipment::equipment_type,
  false, null, v.name_ru, v.aliases, v.instructions_en, v.image_urls
from (values
${values}
) as v(name, slug, primary_muscle, secondary_muscles, mechanic, equipment,
       name_ru, aliases, instructions_en, image_urls)
where not exists (
  select 1 from exercises e
  where e.is_custom = false
    and (lower(e.name) = lower(v.name) or e.slug = v.slug)
);

-- Backfill photos onto pre-existing rows that match by name and have none.
update exercises e
set image_urls = v.image_urls
from (values
${backfill}
) as v(name, image_urls)
where lower(e.name) = lower(v.name)
  and e.is_custom = false
  and coalesce(array_length(e.image_urls, 1), 0) = 0;
`
  writeFileSync(MIGRATION_PATH, sql, 'utf8')
  console.log(`OK: ${rows.length} exercises -> ${MIGRATION_PATH}`)
}

void main()
```

- [ ] **Step 3: Smoke-run without RU data**

Run: `mkdir -p scripts/data && echo {} > scripts/data/exercise-ru.json && npx tsx scripts/import-free-exercise-db.ts`
Expected: exit 1 with `Missing RU entries: <N>` followed by the sorted list of names (~700+). This list drives Task 3. No migration file written.

- [ ] **Step 4: Run full test suite (unchanged)**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-free-exercise-db.ts package.json package-lock.json
git commit -m "feat(exercises): free-exercise-db migration generator script"
```

---

### Task 3: Author RU translations + generate the migration

Content task, no TDD. The executor (Claude) authors `scripts/data/exercise-ru.json` from the missing-names list printed by the script.

**Files:**

- Create: `scripts/data/exercise-ru.json`
- Create (generated): `supabase/migrations/20260719120000_import_free_exercise_db.sql`

**Interfaces:**

- Consumes: missing-names list from Task 2 Step 3.
- Produces: the applied-later migration; ~800 exercises with `name_ru` for all and curated slang aliases for the ~300 most common.

**Format** (keyed by exact source `name`; `aliases` and `primary_muscle` optional):

```json
{
  "Barbell Bench Press": {
    "name_ru": "Жим штанги лёжа",
    "aliases": ["жим лежа", "бенч", "жим штанги лежа"]
  },
  "Hack Squat": {
    "name_ru": "Гак-приседания",
    "aliases": ["гак", "гак присед", "гакк"]
  },
  "Pullups": {
    "name_ru": "Подтягивания",
    "aliases": ["турник", "подтягивания широким хватом"]
  },
  "Seated Cable Rows": {
    "name_ru": "Тяга нижнего блока сидя",
    "aliases": ["горизонтальная тяга", "тяга к поясу сидя"]
  },
  "Leverage Chest Press": {
    "name_ru": "Жим в хаммере на грудь",
    "aliases": ["хаммер", "хаммер жим", "жим в хаммере"]
  }
}
```

**Authoring rules:** natural gym-Russian names (not literal translations); aliases lowercase, ё→е allowed in aliases; slang aliases only for exercises a Russian gym-goer actually names (target ~300 entries with aliases, the rest `name_ru` only); use `primary_muscle` override where the `shoulders → side_delts` default is wrong (e.g. overhead presses → `front_delts`).

- [ ] **Step 1: Author `exercise-ru.json` in batches (~100 names per Write/Edit), re-running the script between batches until it prints `OK: <N> exercises -> …`**
- [ ] **Step 2: Sanity-check the generated SQL** — open the migration; verify: values count matches `OK` count, quotes escaped (search `''`), no `undefined`/`null` strings in names, `::muscle_group[]` casts present.
- [ ] **Step 3: Run `npx vitest run`** — all pass (nothing in src changed).
- [ ] **Step 4: Commit**

```bash
git add scripts/data/exercise-ru.json supabase/migrations/20260719120000_import_free_exercise_db.sql
git commit -m "feat(exercises): import ~800 exercises with RU names and slang aliases"
```

---

### Task 4: pg_trgm fuzzy search + lean list columns

**Files:**

- Create: `supabase/migrations/20260719121000_pg_trgm_fuzzy.sql`
- Modify: `src/lib/db/exercises.ts`

**Interfaces:**

- Consumes: existing `searchExercises`, `getExercises` signatures (unchanged).
- Produces: DB function `search_exercises_fuzzy(q text) returns setof exercises`; exported const `EXERCISE_LIST_COLUMNS`. Callers of `getExercises`/`searchExercises` are unchanged — `Exercise`'s `instructions_*` fields are optional, so lean rows still satisfy the type.

- [ ] **Step 1: Write the migration**

```sql
-- Fuzzy search fallback for typo'd queries («жым лижа» → «Жим лёжа»).
create extension if not exists pg_trgm;

create index if not exists exercises_name_trgm_idx
  on exercises using gin (name gin_trgm_ops);
create index if not exists exercises_name_ru_trgm_idx
  on exercises using gin (name_ru gin_trgm_ops);

-- security invoker (default): the caller's RLS on exercises applies, so
-- other users' custom exercises never leak through this function.
create or replace function search_exercises_fuzzy(q text)
returns setof exercises
language sql
stable
as $$
  select *
  from exercises
  where greatest(similarity(name, q), similarity(coalesce(name_ru, ''), q)) > 0.3
  order by greatest(similarity(name, q), similarity(coalesce(name_ru, ''), q)) desc
  limit 5;
$$;
```

- [ ] **Step 2: Lean columns + fuzzy fallback in `src/lib/db/exercises.ts`**

Add below the imports:

```ts
// List/search payload columns. instructions_* are long free text on the
// imported base (~800 rows) and never shown in lists — keeping them out of
// hot paths saves ~1 MB on the workout page payload.
export const EXERCISE_LIST_COLUMNS =
  'id, name, slug, primary_muscle, secondary_muscles, mechanic, equipment, is_custom, created_by, name_ru, aliases, image_urls'
```

In `getExercises`, change `.select('*')` → `.select(EXERCISE_LIST_COLUMNS)`.

In `searchExercises`, change `.select('*')` → `.select(EXERCISE_LIST_COLUMNS)` and replace the final `return (data as Exercise[]) ?? []` with:

```ts
  let rows = (data as Exercise[]) ?? []
  if (rows.length === 0) {
    // Typo fallback: trigram similarity via RPC. RLS still applies (security
    // invoker), the extra filter is defense in depth.
    const { data: fuzzy } = await supabase.rpc('search_exercises_fuzzy', { q })
    rows = ((fuzzy as Exercise[]) ?? []).filter((e) => !e.is_custom || e.created_by === userId)
  }
  return rows
```

(`data` in both selects is typed by supabase-js as a generic row; the `as Exercise[]` casts already exist in this file — keep that pattern. Note `searchExercises`'s `userId` param is already in scope.)

- [ ] **Step 3: Verify**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src scripts`
Expected: tests pass, no type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260719121000_pg_trgm_fuzzy.sql src/lib/db/exercises.ts
git commit -m "feat(search): pg_trgm fuzzy fallback + lean exercise list columns"
```

---

### Task 5: AI suggest service (numbered-catalog pattern)

**Files:**

- Create: `src/lib/services/exercise-suggest.service.ts`
- Test: `src/lib/services/exercise-suggest.service.test.ts`
- Modify: `src/lib/services/ai-quota.service.ts`

**Interfaces:**

- Consumes: `Exercise` type; `Mistral` client (same pattern as `exercise-alternatives.service.ts`).
- Produces (used by Task 6): `SuggestPick { index: number; reason: string }` (1-based index), `serializeCatalog(catalog)`, `parseSuggestions(raw, catalogLength)`, `suggestFromCatalog({ locale, query, catalog }): Promise<SuggestPick[]>`; `AiKind` gains `'exercise_suggest'` with limit 30.

- [ ] **Step 1: Add the quota kind** — in `src/lib/services/ai-quota.service.ts` add `| 'exercise_suggest'` to `AiKind` and `exercise_suggest: 30,` to `DAILY_LIMITS`.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/services/exercise-suggest.service.test.ts
import { describe, it, expect } from 'vitest'
import { serializeCatalog, parseSuggestions } from './exercise-suggest.service'

const catalog = [
  { name: 'Barbell Bench Press', name_ru: 'Жим штанги лёжа', primary_muscle: 'chest', equipment: 'barbell' },
  { name: 'Weird|Name', name_ru: null, primary_muscle: 'back', equipment: 'machine' },
] as never[]

describe('serializeCatalog', () => {
  it('numbers lines from 1 and joins fields with pipes', () => {
    const lines = serializeCatalog(catalog).split('\n')
    expect(lines[0]).toBe('1|Barbell Bench Press|Жим штанги лёжа|chest|barbell')
  })

  it('strips pipes from names and renders null name_ru as empty', () => {
    const lines = serializeCatalog(catalog).split('\n')
    expect(lines[1]).toBe('2|Weird Name||back|machine')
  })
})

describe('parseSuggestions', () => {
  it('keeps valid picks, capped at 3', () => {
    const raw = JSON.stringify({
      items: [
        { index: 1, reason: 'a' },
        { index: 2, reason: 'b' },
        { index: 3, reason: 'c' },
        { index: 4, reason: 'd' },
      ],
    })
    expect(parseSuggestions(raw, 10)).toHaveLength(3)
  })

  it('drops out-of-range, duplicate and non-integer indices', () => {
    const raw = JSON.stringify({
      items: [
        { index: 0, reason: 'a' },
        { index: 11, reason: 'b' },
        { index: 2.5, reason: 'c' },
        { index: 3, reason: 'ok' },
        { index: 3, reason: 'dup' },
      ],
    })
    expect(parseSuggestions(raw, 10)).toEqual([{ index: 3, reason: 'ok' }])
  })

  it('returns [] for garbage JSON or missing items', () => {
    expect(parseSuggestions('not json', 10)).toEqual([])
    expect(parseSuggestions('{"foo":1}', 10)).toEqual([])
  })

  it('coerces non-string reasons to empty string', () => {
    const raw = JSON.stringify({ items: [{ index: 1, reason: 42 }] })
    expect(parseSuggestions(raw, 10)).toEqual([{ index: 1, reason: '' }])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/exercise-suggest.service.test.ts`
Expected: FAIL — cannot resolve `./exercise-suggest.service`.

- [ ] **Step 4: Write the service**

```ts
// src/lib/services/exercise-suggest.service.ts
// «Возможно, вы имели в виду…»: the model picks up to 3 entries from a
// numbered catalog. Index-based responses make hallucinated exercises
// impossible by construction — invalid indices are simply dropped.
import { Mistral } from '@mistralai/mistralai'
import type { Exercise } from '@/lib/types/models'

export interface SuggestPick {
  index: number // 1-based line number in the serialized catalog
  reason: string
}

export type CatalogEntry = Pick<Exercise, 'name' | 'name_ru' | 'primary_muscle' | 'equipment'>

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

export function serializeCatalog(catalog: CatalogEntry[]): string {
  const clean = (s: string) => s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
  return catalog
    .map(
      (e, i) =>
        `${i + 1}|${clean(e.name)}|${clean(e.name_ru ?? '')}|${e.primary_muscle}|${e.equipment}`,
    )
    .join('\n')
}

export function parseSuggestions(raw: string, catalogLength: number): SuggestPick[] {
  let items: unknown
  try {
    items = (JSON.parse(raw) as { items?: unknown }).items
  } catch {
    return []
  }
  if (!Array.isArray(items)) return []
  const seen = new Set<number>()
  const out: SuggestPick[] = []
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const index = (it as { index?: unknown }).index
    const reason = (it as { reason?: unknown }).reason
    if (typeof index !== 'number' || !Number.isInteger(index)) continue
    if (index < 1 || index > catalogLength || seen.has(index)) continue
    seen.add(index)
    out.push({ index, reason: typeof reason === 'string' ? reason.slice(0, 120) : '' })
    if (out.length === 3) break
  }
  return out
}

export async function suggestFromCatalog(ctx: {
  locale: 'ru' | 'en'
  query: string
  catalog: CatalogEntry[]
}): Promise<SuggestPick[]> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')
  if (ctx.catalog.length === 0) return []

  const client = new Mistral({ apiKey })

  const systemPrompt = `You are the search assistant of a gym workout tracker.
The user's search query matched nothing. It may be Russian gym slang, a machine
description, a misspelling, or mixed RU/EN.
The full exercise catalog follows, one entry per line: index|name|name_ru|muscle|equipment.
Pick up to 3 entries the user most likely meant. If nothing plausibly matches,
return an empty list. Reasons: ${ctx.locale === 'ru' ? 'Russian' : 'English'}, max 10 words.
Return ONLY valid JSON: {"items":[{"index":<number>,"reason":"<why this matches>"}]}`

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    temperature: 0.2,
    maxTokens: 300,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `query: ${ctx.query}\n\ncatalog:\n${serializeCatalog(ctx.catalog)}`,
      },
    ],
  })

  const raw = contentToText(response.choices[0]?.message?.content) || '{}'
  return parseSuggestions(raw, ctx.catalog.length)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/exercise-suggest.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/exercise-suggest.service.ts src/lib/services/exercise-suggest.service.test.ts src/lib/services/ai-quota.service.ts
git commit -m "feat(ai): exercise suggest service — numbered catalog picks"
```

---

### Task 6: Server action `suggestExercisesAction`

**Files:**

- Modify: `src/app/(app)/workout/[id]/actions.ts`

**Interfaces:**

- Consumes: `suggestFromCatalog` (Task 5), `getExercises`, `consumeAiQuota`, `AiQuotaExceededError`, `verifySession`, `getLocale` — all already imported or importable in this file.
- Produces (used by Task 7): `ExerciseSuggestion { exercise: Exercise; reason: string }` and `suggestExercisesAction(query: string): Promise<ExerciseSuggestion[]>`. Never throws to the client on AI/quota failure — returns `[]`.

- [ ] **Step 1: Add the action**

Add to imports: `import { suggestFromCatalog } from '@/lib/services/exercise-suggest.service'`.
Add after `searchExercisesAction`:

```ts
export interface ExerciseSuggestion {
  exercise: Exercise
  reason: string
}

export async function suggestExercisesAction(query: string): Promise<ExerciseSuggestion[]> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []
  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, user.id, 'exercise_suggest')
  } catch (e) {
    if (e instanceof AiQuotaExceededError) return []
    throw e
  }

  const catalog = await getExercises(supabase, user.id)
  try {
    const picks = await suggestFromCatalog({ locale, query: q, catalog })
    return picks.map((p) => ({ exercise: catalog[p.index - 1], reason: p.reason }))
  } catch (e) {
    // Mistral down / bad JSON → degrade to "nothing found"; the client then
    // shows the create-custom CTA.
    console.error('suggestExercisesAction:', e)
    return []
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/workout/[id]/actions.ts"
git commit -m "feat(ai): suggestExercisesAction — AI did-you-mean over the catalog"
```

---

### Task 7: ExerciseSearch UI + i18n

**Files:**

- Modify: `src/components/workout/ExerciseSearch.tsx`
- Modify: `messages/ru.json`, `messages/en.json` (inside the existing `"workout"` block)

**Interfaces:**

- Consumes: `suggestExercisesAction`, `ExerciseSuggestion` (Task 6).
- Produces: auto AI fallback in the search dropdown; no API change for parent components.

- [ ] **Step 1: i18n keys**

`messages/ru.json`, inside `"workout": {…}` add:

```json
"aiSearching": "ИИ подбирает варианты…",
"aiDidYouMean": "Возможно, вы имели в виду…"
```

`messages/en.json`, inside `"workout": {…}` add:

```json
"aiSearching": "AI is thinking…",
"aiDidYouMean": "Did you mean…"
```

- [ ] **Step 2: Wire the AI fallback into `ExerciseSearch.tsx`**

Change the react import to `import { useEffect, useRef, useState, useTransition } from 'react'`; add `Sparkles` to the lucide import; extend the actions import to `import { searchExercisesAction, suggestExercisesAction, type ExerciseSuggestion } from '@/app/(app)/workout/[id]/actions'`.

Add state after `formOpenFor`:

```tsx
const [aiItems, setAiItems] = useState<ExerciseSuggestion[]>([])
const [aiLoading, setAiLoading] = useState(false)
const aiAskedFor = useRef<string>('')
```

In `handleChange`, right after `setSearched(false)` add `setAiItems([])`.
In `select`, add `setAiItems([])` before `setSearched(false)`.

Add the trigger effect after `handleChange`:

```tsx
// Auto AI fallback: fires once per query, 800 ms after typing stops, only
// when the normal (+fuzzy) search came back empty and we're online.
useEffect(() => {
  if (!searched || results.length > 0 || query.length < 2) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  if (aiAskedFor.current === query) return
  const timer = setTimeout(() => {
    aiAskedFor.current = query
    setAiLoading(true)
    void suggestExercisesAction(query)
      .then((items) => setAiItems(items))
      .catch(() => setAiItems([]))
      .finally(() => setAiLoading(false))
  }, 800)
  return () => clearTimeout(timer)
}, [query, searched, results.length])
```

In the dropdown `<ul>`, insert BEFORE the `showCreateHint` `<li>`:

```tsx
{showCreateHint && aiLoading && (
  <li className="px-3 py-3 flex items-center gap-2 text-xs text-zinc-400">
    <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#FF6E76' }} />
    {t('aiSearching')}
  </li>
)}
{showCreateHint && !aiLoading && aiItems.length > 0 && (
  <>
    <li className="px-3 pt-3 pb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
      <Sparkles className="h-3 w-3" style={{ color: '#FF6E76' }} />
      {t('aiDidYouMean')}
    </li>
    {aiItems.map(({ exercise, reason }) => {
      const thumb = exercise.image_urls?.[0]
      return (
        <li key={exercise.id}>
          <button
            className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-3"
            onClick={() => select(exercise)}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="w-10 h-10 rounded object-cover flex-shrink-0 bg-white/5"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{displayName(exercise)}</p>
              <p className="text-xs text-zinc-500 truncate">{reason}</p>
            </div>
          </button>
        </li>
      )
    })}
  </>
)}
```

Leave the existing `showCreateHint` create-CTA `<li>` unchanged after these blocks (while AI is loading it stays visible — that's fine, the user can still create instead of waiting).

- [ ] **Step 3: Verify**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src`
Expected: clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/workout/ExerciseSearch.tsx messages/ru.json messages/en.json
git commit -m "feat(search): AI did-you-mean suggestions in exercise search"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full gate**

Run:

```bash
npx tsc --noEmit && npx eslint src scripts && npx vitest run
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" npm run build
```

Expected: no type/lint errors; all tests pass (79 pre-existing + Tasks 1 and 5 additions); build succeeds.

- [ ] **Step 2: Manual checklist (needs real `.env.local` + applied migrations — user)**

1. Apply migrations: `supabase db push` (or paste the two new SQL files into the Supabase SQL editor **in order**: import, then pg_trgm).
2. In a workout: search «жым лижа» → fuzzy returns «Жим лёжа» instantly.
3. Search «жим в хаммере на грудь» → «ИИ подбирает варианты…» → cards appear; tap adds the exercise.
4. Search gibberish («ыыыыы») → AI returns nothing → create-custom CTA.
5. DevTools offline → search misses skip the AI step and show the CTA immediately.
6. Exercise library page shows the enlarged base with photos.
