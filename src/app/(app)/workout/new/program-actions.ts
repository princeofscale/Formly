'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { createTemplate } from '@/lib/db/templates'
import {
  generateProgram,
  type ExperienceLevel,
  type GeneratedDay,
  type ProgramGoal,
} from '@/lib/services/program-generator.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'
import type { Exercise, TemplateExercise } from '@/lib/types/models'

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
}

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
  const { user } = await verifySession()
  const supabase = await createClient()
  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, user.id, 'program_generation')
  } catch (e) {
    // Server-action files can't export non-function values, so the UI
    // detects the literal "quota" substring in the error message
    // instead of getting a typed sentinel back.
    if (e instanceof AiQuotaExceededError) throw new Error('AI quota exhausted')
    throw e
  }

  const daysPerWeek = Math.min(7, Math.max(1, Math.round(input.daysPerWeek)))
  const all = await getExercises(supabase, user.id)
  const library = buildLibrary(all, input.location)

  // Pull profile for age-aware safety + experience classification
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('age, training_since')
    .eq('id', user.id)
    .maybeSingle()
  const profile = profileRaw as unknown as {
    age: number | null
    training_since: string | null
  } | null

  const generated: GeneratedDay[] = await generateProgram({
    locale,
    goal: input.goal,
    daysPerWeek,
    location: input.location,
    age: profile?.age ?? null,
    experience: classifyExperience(profile?.training_since),
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
  userId: string,
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map()

  // One batched query: every set the user has logged for any of these
  // exercises, newest first. We'll group + take the first in JS.
  const { data } = await supabase
    .from('set_entries')
    .select('exercise_id, weight_kg, created_at')
    .eq('user_id', userId)
    .in('exercise_id', ids)
    .gt('weight_kg', 0)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (data as unknown as Array<{ exercise_id: string; weight_kg: number }> | null) ?? []
  const out = new Map<string, number>()
  for (const r of rows) {
    if (!out.has(r.exercise_id)) out.set(r.exercise_id, r.weight_kg)
  }
  return out
}

export async function saveProgramAsTemplatesAction(input: {
  goal: ProgramGoal
  days: PreviewDay[]
}): Promise<{ saved: number }> {
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
  )[input.goal]

  // Pre-fill default_weight_kg from the user's last logged weight per exercise
  const allExerciseIds = Array.from(
    new Set(input.days.flatMap((d) => d.exercises.map((e) => e.exercise_id))),
  )
  const lastWeights = await loadLastWeights(supabase, user.id, allExerciseIds)

  let saved = 0
  for (let i = 0; i < input.days.length; i++) {
    const day = input.days[i]
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
    await createTemplate(supabase, user.id, name, exercises)
    saved++
  }

  revalidatePath('/workout/new')
  return { saved }
}
