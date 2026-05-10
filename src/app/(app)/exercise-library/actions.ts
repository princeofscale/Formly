'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { deleteExercise } from '@/lib/db/exercises'

const exerciseSchema = z.object({
  name: z.string().min(2).max(100),
  primary_muscle: z.string(),
  secondary_muscles: z.array(z.string()).default([]),
  mechanic: z.enum(['compound', 'isolation']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']),
})

export async function createExerciseAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const parsed = exerciseSchema.parse({
    name: formData.get('name'),
    primary_muscle: formData.get('primary_muscle'),
    secondary_muscles: formData.getAll('secondary_muscles'),
    mechanic: formData.get('mechanic'),
    equipment: formData.get('equipment'),
  })

  const slug = (parsed.name as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await supabase
    .from('exercises')
    .insert({
      name: parsed.name,
      slug,
      primary_muscle: parsed.primary_muscle,
      secondary_muscles: parsed.secondary_muscles,
      mechanic: parsed.mechanic,
      equipment: parsed.equipment,
      is_custom: true,
      created_by: user.id,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/exercise-library')
}

export async function deleteExerciseAction(id: string): Promise<void> {
  await verifySession()
  const supabase = await createClient()
  await deleteExercise(supabase, id)
  revalidatePath('/exercise-library')
}
