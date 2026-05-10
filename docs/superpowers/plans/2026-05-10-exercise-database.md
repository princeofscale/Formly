# Exercise Database Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import 800+ exercises from `yuhonas/free-exercise-db` (public domain) with static JPG images, add Russian name translations via Claude API batch, and update exercise search to work in both languages.

**Architecture:** New Supabase migration adds `name_ru`, `instructions_en`, `instructions_ru`, `image_urls` columns to `exercises`. A one-off Node.js import script (`scripts/import-exercises.ts`) fetches the JSON dataset, maps muscle groups to app schema, and upserts into Supabase. A translation script (`scripts/translate-exercises.ts`) reads un-translated exercises and batch-calls Claude API (haiku model, cheap) to fill `name_ru`. `searchExercisesAction` is updated to search both `name` and `name_ru`. The existing 29 seeded exercises are preserved; imported exercises are marked `is_custom = false, created_by = null`.

**Tech Stack:** Supabase (PostgreSQL), Next.js server action, `@anthropic-ai/sdk`, Node.js scripts run via `npx tsx scripts/...`.

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_exercise_i18n.sql` | Add `name_ru`, `instructions_en`, `instructions_ru`, `image_urls` columns |
| `scripts/import-exercises.ts` | Fetch yuhonas dataset, map muscles, upsert to Supabase |
| `scripts/translate-exercises.ts` | Batch-translate `name_ru` via Claude API |
| `src/lib/db/exercises.ts` | Update `searchExercises` to search `name_ru` too |
| `src/lib/types/models.ts` | Add optional fields to `Exercise` type |
| `src/lib/types/database.types.ts` | Add new columns to exercises Row/Insert types |
| `src/components/workout/ExerciseSearch.tsx` | Show `name_ru` when locale = 'ru' |
| `src/app/(app)/workout/[id]/actions.ts` | Pass locale to search action |

---

## Task 1: Supabase migration — add i18n columns to exercises

**Files:**
- Create: `supabase/migrations/20260510120000_exercise_i18n.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260510120000_exercise_i18n.sql
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS name_ru        TEXT,
  ADD COLUMN IF NOT EXISTS instructions_en TEXT,
  ADD COLUMN IF NOT EXISTS instructions_ru TEXT,
  ADD COLUMN IF NOT EXISTS image_urls      TEXT[] DEFAULT '{}';
```

- [ ] **Step 2: Apply migration to remote Supabase**

```bash
cd /Users/princeofscale/Desktop/Training-Site
npx supabase db push
```

Expected output: `Applying migration 20260510120000_exercise_i18n.sql`

If `supabase` CLI isn't linked, run `npx supabase link` first (uses project from `.env.local`).

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/20260510120000_exercise_i18n.sql
git commit -m "feat: add name_ru, instructions, image_urls columns to exercises"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/types/models.ts`
- Modify: `src/lib/types/database.types.ts`

- [ ] **Step 1: Update `Exercise` interface in `src/lib/types/models.ts`**

Find the `Exercise` interface and add optional fields:

```typescript
export interface Exercise {
  id: string
  name: string
  slug: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  equipment: Equipment
  mechanic: Mechanic
  is_custom: boolean
  created_by: string | null
  created_at: string
  // i18n + media (added in exercise database import)
  name_ru?: string | null
  instructions_en?: string | null
  instructions_ru?: string | null
  image_urls?: string[]
}
```

- [ ] **Step 2: Update `database.types.ts` exercises Row**

Find the `exercises` Row type and add:
```typescript
image_urls: string[] | null
instructions_en: string | null
instructions_ru: string | null
name_ru: string | null
```

And in Insert:
```typescript
image_urls?: string[] | null
instructions_en?: string | null
instructions_ru?: string | null
name_ru?: string | null
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/models.ts src/lib/types/database.types.ts
git commit -m "types: add exercise i18n and image fields"
```

---

## Task 3: Import script — fetch and upsert yuhonas/free-exercise-db

**Files:**
- Create: `scripts/import-exercises.ts`

The dataset is available as a JSON array at:
`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`

Each exercise has this shape:
```json
{
  "id": "Alternate_Incline_Dumbbell_Curl",
  "name": "Alternate Incline Dumbbell Curl",
  "force": "pull",
  "level": "beginner",
  "mechanic": "isolation",
  "equipment": "dumbbell",
  "primaryMuscles": ["biceps"],
  "secondaryMuscles": ["forearms"],
  "instructions": ["Sit down on an incline bench..."],
  "category": "strength",
  "images": ["Alternate_Incline_Dumbbell_Curl/0.jpg", "Alternate_Incline_Dumbbell_Curl/1.jpg"]
}
```

Images are hosted at:
`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{path}`

- [ ] **Step 1: Create `scripts/import-exercises.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DATASET_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

// Map free-exercise-db muscle names to app MuscleGroup enum
const MUSCLE_MAP: Record<string, string> = {
  abdominals: 'core',
  abductors: 'glutes',
  adductors: 'glutes',
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
  shoulders: 'front_delts',
  traps: 'traps',
  triceps: 'triceps',
}

// Map equipment names to app Equipment enum
const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  'cable': 'cable',
  machine: 'machine',
  'body only': 'bodyweight',
  'medicine ball': 'other',
  'exercise ball': 'other',
  'e-z curl bar': 'barbell',
  'foam roll': 'other',
  'kettlebells': 'dumbbell',
  bands: 'other',
  other: 'other',
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Fetching exercise dataset...')
  const res = await fetch(DATASET_URL)
  const exercises = await res.json() as any[]
  console.log(`Fetched ${exercises.length} exercises`)

  let inserted = 0
  let skipped = 0

  for (const ex of exercises) {
    const primaryRaw = ex.primaryMuscles?.[0] ?? 'chest'
    const primary = MUSCLE_MAP[primaryRaw]
    if (!primary) {
      console.warn(`Unknown primary muscle: ${primaryRaw} for ${ex.name}`)
      skipped++
      continue
    }

    const secondary = (ex.secondaryMuscles ?? [])
      .map((m: string) => MUSCLE_MAP[m])
      .filter(Boolean)

    const equipment = EQUIPMENT_MAP[ex.equipment] ?? 'other'
    const mechanic = ex.mechanic === 'compound' ? 'compound' : 'isolation'
    const slug = slugify(ex.name)
    const imageUrls = (ex.images ?? []).map((img: string) => `${IMAGE_BASE}${img}`)
    const instructions = (ex.instructions ?? []).join('\n\n')

    const { error } = await supabase
      .from('exercises')
      .upsert({
        slug,
        name: ex.name,
        primary_muscle: primary,
        secondary_muscles: secondary,
        equipment,
        mechanic,
        is_custom: false,
        created_by: null,
        instructions_en: instructions || null,
        image_urls: imageUrls,
      }, {
        onConflict: 'slug',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error(`Error inserting ${ex.name}:`, error.message)
      skipped++
    } else {
      inserted++
      if (inserted % 50 === 0) console.log(`  ${inserted} inserted...`)
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
}

main().catch(console.error)
```

- [ ] **Step 2: Install required packages if not present**

```bash
cd /Users/princeofscale/Desktop/Training-Site
npm install dotenv --save-dev 2>/dev/null; npm ls @supabase/supabase-js | head -2
```

Expected: `@supabase/supabase-js@...` (already installed as it's used by the app).

- [ ] **Step 3: Run the import script**

```bash
cd /Users/princeofscale/Desktop/Training-Site
npx tsx scripts/import-exercises.ts
```

Expected output:
```
Fetching exercise dataset...
Fetched 868 exercises
  50 inserted...
  100 inserted...
  ...
Done: 850+ inserted, N skipped
```

- [ ] **Step 4: Verify in Supabase**

```bash
# Count exercises now in the database
npx tsx -e "
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
s.from('exercises').select('id', { count: 'exact', head: true }).then(r => console.log('Total exercises:', r.count))
"
```

Expected: 850+ exercises.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-exercises.ts
git commit -m "feat: exercise import script — yuhonas/free-exercise-db 800+ exercises"
```

---

## Task 4: Translate exercise names to Russian via Claude API

**Files:**
- Create: `scripts/translate-exercises.ts`

This script reads all exercises where `name_ru IS NULL`, batches them 50 at a time, calls Claude API (haiku) to translate names and a short description, then writes back to Supabase. Total cost: ~$1-3 for 800 names.

- [ ] **Step 1: Ensure `@anthropic-ai/sdk` is installed**

```bash
cd /Users/princeofscale/Desktop/Training-Site
npm ls @anthropic-ai/sdk | head -2
```

If not installed:
```bash
npm install @anthropic-ai/sdk --save-dev
```

- [ ] **Step 2: Add `ANTHROPIC_API_KEY` to `.env.local` if not present**

Check:
```bash
grep ANTHROPIC_API_KEY /Users/princeofscale/Desktop/Training-Site/.env.local
```

If missing, add:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from https://console.anthropic.com/settings/keys

- [ ] **Step 3: Create `scripts/translate-exercises.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BATCH_SIZE = 50

interface ExerciseRow {
  id: string
  name: string
}

async function translateBatch(client: Anthropic, exercises: ExerciseRow[]): Promise<Record<string, string>> {
  const list = exercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n')

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate these fitness exercise names from English to Russian. 
Use standard Russian fitness/gym terminology (e.g., "Bench Press" → "Жим лёжа", "Squat" → "Приседания", "Deadlift" → "Становая тяга").
Return ONLY a JSON object mapping the exercise number to Russian name, e.g. {"1": "Жим лёжа", "2": "Приседания"}.
No markdown, no explanation, just the JSON.

${list}`,
    }],
  })

  const text = (msg.content[0] as { text: string }).text.trim()
  // Strip markdown code blocks if present
  const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(json)
}

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all exercises without Russian translation
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name')
    .is('name_ru', null)
    .order('name')

  if (error) throw error
  if (!exercises || exercises.length === 0) {
    console.log('All exercises already translated.')
    return
  }

  console.log(`Translating ${exercises.length} exercises in batches of ${BATCH_SIZE}...`)
  let translated = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE)
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(exercises.length / BATCH_SIZE)}...`)

    const translations = await translateBatch(anthropic, batch)

    for (let j = 0; j < batch.length; j++) {
      const ruName = translations[String(j + 1)]
      if (!ruName) {
        console.warn(`  Missing translation for: ${batch[j].name}`)
        continue
      }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ name_ru: ruName })
        .eq('id', batch[j].id)

      if (updateErr) {
        console.error(`  Error updating ${batch[j].name}:`, updateErr.message)
      } else {
        translated++
      }
    }

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\nDone: ${translated} exercises translated to Russian.`)
}

main().catch(console.error)
```

- [ ] **Step 4: Run translation script**

```bash
cd /Users/princeofscale/Desktop/Training-Site
npx tsx scripts/translate-exercises.ts
```

Expected output:
```
Translating 850 exercises in batches of 50...
  Batch 1/17...
  Batch 2/17...
  ...
Done: 850 exercises translated to Russian.
```

Duration: ~3-5 minutes. Cost: ~$1-3.

- [ ] **Step 5: Commit script**

```bash
git add scripts/translate-exercises.ts
git commit -m "feat: Claude API batch translation script for exercise names (ru)"
```

---

## Task 5: Update exercise search to support Russian

**Files:**
- Modify: `src/lib/db/exercises.ts`
- Modify: `src/app/(app)/workout/[id]/actions.ts`
- Modify: `src/components/workout/ExerciseSearch.tsx`

- [ ] **Step 1: Read `src/lib/db/exercises.ts` and update search function**

The current file has a `searchExercises` function. Read the file first to see exact current state, then add locale-aware search:

```typescript
export async function searchExercises(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  locale: string = 'en'
): Promise<Exercise[]> {
  if (locale === 'ru') {
    // Search both name and name_ru
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .or(`name.ilike.%${query}%,name_ru.ilike.%${query}%`)
      .or(`is_custom.eq.false,created_by.eq.${userId}`)
      .limit(10)
    return (data ?? []) as Exercise[]
  }

  const { data } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .limit(10)
  return (data ?? []) as Exercise[]
}
```

- [ ] **Step 2: Update `searchExercisesAction` in `src/app/(app)/workout/[id]/actions.ts`**

Read the file, then update `searchExercisesAction` to accept and pass locale:

```typescript
export async function searchExercisesAction(query: string, locale: string = 'en'): Promise<Exercise[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  return searchExercises(supabase, user.id, query, locale)
}
```

- [ ] **Step 3: Update `ExerciseSearch.tsx` to pass locale and show Russian names**

Read the current file (already updated in Plan 1), then update to:
1. Get current locale via `useLocale()` from next-intl
2. Pass locale to `searchExercisesAction`
3. Show `ex.name_ru ?? ex.name` when locale is 'ru'

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslations, useLocale } from 'next-intl'
import { searchExercisesAction } from '@/app/(app)/workout/[id]/actions'
import type { Exercise } from '@/lib/types/models'

interface Props {
  onSelect: (exercise: Exercise) => void
}

export function ExerciseSearch({ onSelect }: Props) {
  const t = useTranslations('workout')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    setQuery(value)
    if (value.length < 2) { setResults([]); return }
    startTransition(async () => {
      const found = await searchExercisesAction(value, locale)
      setResults(found)
    })
  }

  function select(ex: Exercise) {
    onSelect(ex)
    setQuery('')
    setResults([])
  }

  function displayName(ex: Exercise): string {
    return locale === 'ru' && ex.name_ru ? ex.name_ru : ex.name
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder={t('searchPlaceholder')}
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
                <span className="font-medium">{displayName(ex)}</span>
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

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/exercises.ts "src/app/(app)/workout/[id]/actions.ts" src/components/workout/ExerciseSearch.tsx
git commit -m "feat: exercise search supports Russian locale — searches name_ru, displays localized names"
```

---

## Task 6: Type-check and deploy

- [ ] **Step 1: Run type check**

```bash
cd /Users/princeofscale/Desktop/Training-Site && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Verify in production**
  - Open https://training-ar.vercel.app/workout/new — start a workout
  - Switch locale to Russian (profile page → language selector)
  - Type "жим" in exercise search — should return bench press variants
  - Type "Bench" — should also work (searches `name` column too)
  - Verify 800+ exercises appear in search results
