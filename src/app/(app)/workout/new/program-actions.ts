'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { createTemplate } from '@/lib/db/templates'
import {
  generateProgram,
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

export class ProgramQuotaError extends Error {
  constructor() {
    super('Daily program-generation quota exhausted')
    this.name = 'ProgramQuotaError'
  }
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
    if (e instanceof AiQuotaExceededError) throw new ProgramQuotaError()
    throw e
  }

  const daysPerWeek = Math.min(7, Math.max(1, Math.round(input.daysPerWeek)))
  const all = await getExercises(supabase, user.id)
  const library = buildLibrary(all, input.location)

  const generated: GeneratedDay[] = await generateProgram({
    locale,
    goal: input.goal,
    daysPerWeek,
    location: input.location,
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
        default_weight_kg: null,
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
