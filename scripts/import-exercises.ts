import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

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

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  'body only': 'bodyweight',
  'medicine ball': 'other',
  'exercise ball': 'other',
  'e-z curl bar': 'barbell',
  'foam roll': 'other',
  kettlebells: 'dumbbell',
  bands: 'other',
  other: 'other',
}

interface SourceExercise {
  name: string
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  equipment?: string
  mechanic?: string
  images?: string[]
  instructions?: string[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function isSourceExercise(value: unknown): value is SourceExercise {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as { name?: unknown }).name === 'string'
  )
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log('Fetching exercise dataset...')
  const res = await fetch(DATASET_URL)
  const rawExercises: unknown = await res.json()
  if (!Array.isArray(rawExercises)) throw new Error('Exercise dataset is not an array')
  const exercises = rawExercises.filter(isSourceExercise)
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

    const secondary = (ex.secondaryMuscles ?? []).map((m: string) => MUSCLE_MAP[m]).filter(Boolean)

    const equipmentRaw = ex.equipment ?? 'other'
    const equipment = EQUIPMENT_MAP[equipmentRaw] ?? 'other'
    const mechanic = ex.mechanic === 'compound' ? 'compound' : 'isolation'
    const slug = slugify(ex.name)
    const imageUrls = (ex.images ?? []).map((img: string) => `${IMAGE_BASE}${img}`)
    const instructions = (ex.instructions ?? []).join('\n\n')

    const { error } = await supabase.from('exercises').upsert(
      {
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
      },
      {
        onConflict: 'slug',
        ignoreDuplicates: false,
      },
    )

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
