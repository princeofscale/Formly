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
