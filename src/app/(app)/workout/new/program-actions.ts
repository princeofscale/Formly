'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { z } from 'zod'
import {
  generateProgram,
  type ExperienceLevel,
  type GeneratedDay,
  type ProgramGoal,
} from '@/lib/services/program-generator.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'
import { buildTrainingSnapshot } from '@/lib/services/training-snapshot.service'
import type { Exercise, TemplateExercise } from '@/lib/types/models'
import type { Json } from '@/lib/types/database.types'

export interface PreviewDay {
  day_label: string
  exercises: Array<{
    exercise_id: string
    name: string
    sets: number
    reps: number
  }>
}

export interface GenerateProgramInput {
  goal: ProgramGoal
  daysPerWeek: number
  location: 'gym' | 'home_dumbbells' | 'home_bodyweight'
  /** Optional remarks for the coach. Left out, the plan rests on history alone. */
  notes?: string
}

const generateProgramSchema = z.object({
  goal: z.enum(['strength', 'hypertrophy', 'general']),
  daysPerWeek: z.number().int().min(1).max(7),
  location: z.enum(['gym', 'home_dumbbells', 'home_bodyweight']),
  notes: z.string().trim().max(500).optional(),
})

const previewDaySchema = z.object({
  day_label: z.string().trim().min(1).max(60),
  exercises: z
    .array(
      z.object({
        exercise_id: z.uuid(),
        name: z.string().max(200),
        sets: z.number().int().min(1).max(8),
        reps: z.number().int().min(1).max(30),
      }),
    )
    .min(1)
    .max(8),
})

const saveProgramSchema = z.object({
  goal: z.enum(['strength', 'hypertrophy', 'general']),
  days: z.array(previewDaySchema).min(1).max(7),
})

function buildLibrary(all: Exercise[], location: GenerateProgramInput['location']): Exercise[] {
  if (location === 'home_bodyweight') {
    return all.filter((e) => e.equipment === 'bodyweight')
  }
  if (location === 'home_dumbbells') {
    return all.filter((e) => e.equipment === 'dumbbell' || e.equipment === 'bodyweight')
  }
  return all
}

function classifyExperience(trainingSince: string | null | undefined): ExperienceLevel {
  if (!trainingSince) return 'beginner'
  const start = new Date(trainingSince).getTime()
  if (!Number.isFinite(start)) return 'beginner'
  const years = (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 1) return 'beginner'
  if (years < 3) return 'intermediate'
  return 'advanced'
}

export async function previewProgramAction(input: GenerateProgramInput): Promise<{
  days: PreviewDay[]
}> {
  const values = generateProgramSchema.parse(input)
  const { user } = await verifySession()
  const supabase = await createClient()
  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, 'program_generation')
  } catch (e) {
    // Server-action files can't export non-function values, so the UI
    // detects the literal "quota" substring in the error message
    // instead of getting a typed sentinel back.
    if (e instanceof AiQuotaExceededError) throw new Error('AI quota exhausted')
    throw e
  }

  const daysPerWeek = values.daysPerWeek
  const all = await getExercises(supabase, user.id)
  const library = buildLibrary(all, values.location)

  // Profile for age-aware safety + experience; snapshot so the split answers
  // to what the athlete has actually been training, not just the three inputs.
  const [{ data: profileRaw }, snapshot] = await Promise.all([
    supabase.from('profiles').select('age, training_since').eq('id', user.id).maybeSingle(),
    buildTrainingSnapshot(supabase, user.id, locale, values.goal),
  ])
  const profile = profileRaw as unknown as {
    age: number | null
    training_since: string | null
  } | null

  const generated: GeneratedDay[] = await generateProgram({
    locale,
    goal: values.goal,
    daysPerWeek,
    location: values.location,
    age: profile?.age ?? null,
    experience: classifyExperience(profile?.training_since),
    notes: values.notes,
    history: {
      weekly_volumes: snapshot.weekly_volumes,
      volume_landmarks: snapshot.volume_landmarks,
      top_prs: snapshot.top_prs,
    },
    library,
  })

  const byId = new Map(all.map((e) => [e.id, e]))
  const days: PreviewDay[] = generated.map((d) => ({
    day_label: d.day_label,
    exercises: d.exercises
      .map((ex) => {
        const found = byId.get(ex.exercise_id)
        if (!found) return null
        return {
          exercise_id: ex.exercise_id,
          name: locale === 'ru' ? (found.name_ru ?? found.name) : found.name,
          sets: ex.sets,
          reps: ex.reps,
        }
      })
      .filter((x): x is PreviewDay['exercises'][number] => x !== null),
  }))

  return { days }
}

/**
 * For every exercise_id in `ids`, find the user's most-recent logged weight.
 * Returns a Map<exercise_id, weight_kg>. Skips bodyweight (weight 0) entries
 * since they're not useful as starting-weight defaults.
 */
async function loadLastWeights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase.rpc('get_last_weights_for_exercises', {
    p_exercise_ids: ids,
  })
  if (error) throw new Error(error.message)
  return new Map(
    ((data as Array<{ exercise_id: string; weight_kg: number }> | null) ?? []).map((row) => [
      row.exercise_id,
      row.weight_kg,
    ]),
  )
}

export async function saveProgramAsTemplatesAction(input: {
  goal: ProgramGoal
  days: PreviewDay[]
}): Promise<{ saved: number }> {
  const values = saveProgramSchema.parse(input)
  const { user } = await verifySession()
  const supabase = await createClient()
  const all = await getExercises(supabase, user.id)
  const byId = new Map(all.map((e) => [e.id, e]))

  const goalPrefix = (
    {
      strength: 'AI Сила',
      hypertrophy: 'AI Гипертрофия',
      general: 'AI Общая',
    } as const
  )[values.goal]

  // Pre-fill default_weight_kg from the user's last logged weight per exercise
  const allExerciseIds = Array.from(
    new Set(values.days.flatMap((d) => d.exercises.map((e) => e.exercise_id))),
  )
  const lastWeights = await loadLastWeights(supabase, allExerciseIds)

  const templates: Array<{ name: string; exercises: TemplateExercise[] }> = []
  for (const day of values.days) {
    const exercises: TemplateExercise[] = day.exercises.flatMap((ex) => {
      const found = byId.get(ex.exercise_id)
      if (!found) return []
      const tpl: TemplateExercise = {
        exercise_id: ex.exercise_id,
        name: found.name,
        name_ru: found.name_ru ?? null,
        default_weight_kg: lastWeights.get(ex.exercise_id) ?? null,
        default_reps: ex.reps,
      }
      return [tpl]
    })

    if (exercises.length === 0) continue
    const name = `${goalPrefix} · ${day.day_label}`.slice(0, 60)
    templates.push({ name, exercises })
  }

  const { data: saved, error } = await supabase.rpc('save_workout_templates', {
    p_templates: templates as unknown as Json,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/workout/new')
  return { saved: saved ?? 0 }
}
