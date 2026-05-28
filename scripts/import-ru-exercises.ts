import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'

dotenv.config({ path: '.env.local' })

type MuscleGroup =
  | 'chest'
  | 'back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'rear_delts'
  | 'front_delts'
  | 'side_delts'
  | 'cardio'

type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith'
  | 'ez_bar'
  | 'kettlebell'
  | 'band'
  | 'plate'
  | 'other'

interface SourceExercise {
  id: string
  name: string
  muscle: string
  secondary: string[]
  equipment: string
  mechanic: 'compound' | 'isolation'
  aliases: string[]
}

interface SourceFile {
  exercises: SourceExercise[]
}

// Manual map for ambiguous full_body lifts — chosen by primary biomechanics.
// User will visually verify via CSV dump before commit.
const FULL_BODY_MAP: Record<string, MuscleGroup> = {
  'махи гирей': 'glutes',
  'махи гирей одной рукой': 'glutes',
  'турецкий подъём': 'core',
  'турецкий подъем': 'core',
  'рывок гири': 'glutes',
  'заброс гири на грудь': 'glutes',
  'взятие штанги на грудь': 'quads',
  'толчок штанги': 'quads',
  'рывок штанги': 'quads',
  берпи: 'core',
  'запрыгивания на тумбу': 'quads',
  трастеры: 'quads',
  'wall ball': 'quads',
  'махи канатами': 'core',
}

const EQUIPMENT_PASSTHROUGH: Record<string, Equipment> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  bodyweight: 'bodyweight',
  smith: 'smith',
  ez_bar: 'ez_bar',
  kettlebell: 'kettlebell',
  band: 'band',
  plate: 'plate',
  other: 'other',
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim()
}

function normalizeSlug(rawId: string, equipment: string): string {
  let cleaned = rawId.toLowerCase()
  const eq = equipment.toLowerCase()
  if (cleaned.endsWith(eq)) cleaned = cleaned.slice(0, -eq.length)
  cleaned = cleaned
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || rawId.replace(/_/g, '-')
}

function mapLegs(name: string): MuscleGroup {
  const n = normalizeName(name)
  if (/(икр|calf|подъ[её]м на носк)/.test(n)) return 'calves'
  if (/(ягод|glute|hip thrust|тазобедрен|ягодич)/.test(n)) return 'glutes'
  if (
    /(сгибание ног|сгибание бедр|hamstring|румынск|good morning|доброе утро|становая на прям|gm)/.test(
      n,
    )
  )
    return 'hamstrings'
  return 'quads'
}

function mapShoulders(name: string): MuscleGroup {
  const n = normalizeName(name)
  if (/(махи в сторон|боковы|латеральн|lateral|side raise|подъ[её]м гантел[ие]? в сторон)/.test(n))
    return 'side_delts'
  if (/(обратн|задн|reverse|rear|face pull|махи в наклон|пугало)/.test(n)) return 'rear_delts'
  return 'front_delts'
}

function mapMuscle(rawMuscle: string, name: string): MuscleGroup | null {
  if (rawMuscle === 'full_body') {
    const key = normalizeName(name)
    const mapped = FULL_BODY_MAP[key]
    if (!mapped) return null // must be handled explicitly — never silently fallback
    return mapped
  }
  if (rawMuscle === 'cardio') return 'cardio'
  if (rawMuscle === 'legs') return mapLegs(name)
  if (rawMuscle === 'shoulders') return mapShoulders(name)
  // Direct passthrough: chest, back, biceps, triceps, forearms, core, glutes, calves, traps
  if (
    [
      'chest',
      'back',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'calves',
      'traps',
    ].includes(rawMuscle)
  ) {
    return rawMuscle as MuscleGroup
  }
  return null
}

function mapSecondary(rawSecondary: string[], name: string): MuscleGroup[] {
  const result: MuscleGroup[] = []
  for (const raw of rawSecondary) {
    // For secondary, "legs" / "shoulders" are too coarse to infer per-name — pick a sensible default
    if (raw === 'legs') result.push('quads')
    else if (raw === 'shoulders') result.push('front_delts')
    else if (raw === 'full_body')
      continue // skip — full_body as secondary is meaningless
    else if (raw === 'cardio')
      continue // never aggregate cardio as secondary
    else {
      const m = mapMuscle(raw, name)
      if (m && m !== 'cardio') result.push(m)
    }
  }
  return Array.from(new Set(result))
}

interface ExistingExercise {
  id: string
  slug: string
  name: string
  name_ru: string | null
  is_custom: boolean
}

interface PlannedRow {
  source: SourceExercise
  slug: string
  name_ru: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  equipment: Equipment
  mechanic: 'compound' | 'isolation'
  aliases: string[]
  matchedExistingId: string | null
  matchReason: 'slug' | 'new'
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const csvOnly = process.argv.includes('--csv')

  const jsonPath = path.resolve(__dirname, '..', '..', 'exercises.json')
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as SourceFile
  const source = raw.exercises
  console.error(`Loaded ${source.length} source exercises from ${jsonPath}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch all existing non-custom exercises
  const { data: existingData, error: exErr } = await supabase
    .from('exercises')
    .select('id, slug, name, name_ru, is_custom')
    .eq('is_custom', false)
  if (exErr) throw new Error(`Failed to fetch existing: ${exErr.message}`)
  const existing = (existingData as ExistingExercise[]) ?? []
  console.error(`Found ${existing.length} existing non-custom exercises`)

  // Match only by slug — we additively layer RU exercises on top of the
  // existing EN base. Matching by name would risk overwriting an English
  // exercise (e.g. "Bench Press") with a Russian translation, which is not
  // what we want here. Re-running the script is idempotent via slug.
  const bySlug = new Map<string, ExistingExercise>()
  for (const e of existing) bySlug.set(e.slug, e)

  // Build plan
  const planned: PlannedRow[] = []
  const failures: { name: string; reason: string }[] = []

  for (const ex of source) {
    const primary = mapMuscle(ex.muscle, ex.name)
    if (!primary) {
      failures.push({ name: ex.name, reason: `unmapped muscle: ${ex.muscle}` })
      continue
    }
    const secondary = mapSecondary(ex.secondary, ex.name)
    const equipment = EQUIPMENT_PASSTHROUGH[ex.equipment]
    if (!equipment) {
      failures.push({ name: ex.name, reason: `unmapped equipment: ${ex.equipment}` })
      continue
    }
    const slug = normalizeSlug(ex.id, ex.equipment)

    const matched = bySlug.get(slug)
    const reason: PlannedRow['matchReason'] = matched ? 'slug' : 'new'

    planned.push({
      source: ex,
      slug,
      name_ru: ex.name,
      primary_muscle: primary,
      secondary_muscles: secondary,
      equipment,
      mechanic: ex.mechanic,
      aliases: ex.aliases ?? [],
      matchedExistingId: matched?.id ?? null,
      matchReason: reason,
    })
  }

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} unmapped exercises — fix the script before continuing:`)
    for (const f of failures) console.error(`  - ${f.name}: ${f.reason}`)
    process.exit(1)
  }

  // CSV dump for visual verification (stdout, importable into a spreadsheet)
  if (csvOnly || dryRun) {
    console.log('name,primary_muscle,secondary_muscles,equipment,mechanic,slug,match')
    for (const p of planned) {
      const sec = p.secondary_muscles.join('|')
      const aliases = (p.aliases ?? []).join('|')
      const safe = (s: string) => `"${s.replace(/"/g, '""')}"`
      console.log(
        [
          safe(p.name_ru),
          p.primary_muscle,
          safe(sec),
          p.equipment,
          p.mechanic,
          p.slug,
          p.matchReason,
          safe(aliases),
        ].join(','),
      )
    }
    const inserts = planned.filter((p) => p.matchReason === 'new').length
    const updates = planned.length - inserts
    const untouched = existing.length
    console.error(
      `\nSummary: ${inserts} inserts, ${updates} updates by slug, ${untouched} existing rows left untouched`,
    )
    if (dryRun) {
      console.error('\nDry run — no DB changes made. Re-run without --dry-run to apply.')
      return
    }
    if (csvOnly) return
  }

  // Apply — insert new, update existing rows that match by slug. Never delete:
  // the existing EN base coexists with the RU additions.
  let updates = 0
  let inserts = 0
  for (const p of planned) {
    const payload = {
      slug: p.slug,
      name: p.name_ru, // English name unknown — store RU name in `name` too. UI prefers name_ru if available.
      name_ru: p.name_ru,
      primary_muscle: p.primary_muscle,
      secondary_muscles: p.secondary_muscles,
      equipment: p.equipment,
      mechanic: p.mechanic,
      aliases: p.aliases,
      is_custom: false,
      created_by: null,
    }
    if (p.matchedExistingId) {
      const { error } = await supabase
        .from('exercises')
        .update(payload)
        .eq('id', p.matchedExistingId)
      if (error) console.error(`UPDATE ${p.name_ru}: ${error.message}`)
      else updates++
    } else {
      const { error } = await supabase.from('exercises').insert(payload)
      if (error) console.error(`INSERT ${p.name_ru}: ${error.message}`)
      else inserts++
    }
  }

  console.error(`\n✅ Done: ${inserts} inserted, ${updates} updated, ${existing.length} untouched`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
