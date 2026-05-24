'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { deleteExercise } from '@/lib/db/exercises'
import type { MuscleGroup, Exercise } from '@/lib/types/models'

const MUSCLE_VALUES = [
  'chest',
  'back',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'traps',
  'lats',
  'rear_delts',
  'front_delts',
  'side_delts',
] as const

const exerciseSchema = z.object({
  name: z.string().min(2).max(100),
  name_ru: z.string().max(100).optional(),
  primary_muscle: z.enum(MUSCLE_VALUES),
  secondary_muscles: z.array(z.string()).default([]),
  mechanic: z.enum(['compound', 'isolation']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']),
})

export async function createExerciseAction(formData: FormData): Promise<Exercise> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const parsed = exerciseSchema.parse({
    name: formData.get('name'),
    name_ru: formData.get('name_ru') || undefined,
    primary_muscle: formData.get('primary_muscle'),
    secondary_muscles: formData.getAll('secondary_muscles'),
    mechanic: formData.get('mechanic'),
    equipment: formData.get('equipment'),
  })

  const baseSlug = (parsed.name as string)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  // Slug must be unique — append short random suffix to avoid collisions
  const slug = `${baseSlug || 'custom'}-${Math.random().toString(36).slice(2, 7)}`

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: parsed.name,
      name_ru: parsed.name_ru ?? null,
      slug,
      primary_muscle: parsed.primary_muscle,
      secondary_muscles: parsed.secondary_muscles as MuscleGroup[],
      mechanic: parsed.mechanic,
      equipment: parsed.equipment,
      is_custom: true,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/exercise-library')
  return data as Exercise
}

export async function deleteExerciseAction(id: string): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  await deleteExercise(supabase, id)
  revalidatePath('/exercise-library')
}
