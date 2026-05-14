'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createSession, getActiveSession } from '@/lib/db/workouts'
import { createTemplate } from '@/lib/db/templates'
import type { TemplateExercise } from '@/lib/types/models'

export async function deleteSessionAction(sessionId: string) {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    throw new Error('Not found')
  }

  await supabase.from('set_entries').delete().eq('session_id', sessionId)
  await supabase.from('workout_sessions').delete().eq('id', sessionId)

  revalidatePath('/history')
  redirect('/history')
}

interface SetRow {
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  exercises: { id: string; name: string; name_ru: string | null } | null
}

export async function repeatWorkoutAction(sourceSessionId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  // Verify ownership of source session
  const { data: source } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .eq('id', sourceSessionId)
    .single()
  if (!source || source.user_id !== user.id) {
    throw new Error('Source session not found')
  }

  // Get all sets with exercise data, in original order
  const { data: setsData } = await supabase
    .from('set_entries')
    .select('exercise_id, set_number, weight_kg, reps, exercises(id, name, name_ru)')
    .eq('session_id', sourceSessionId)
    .order('created_at', { ascending: true })

  const rows = (setsData ?? []) as unknown as SetRow[]

  // Group by exercise_id preserving first-appearance order; take last set for defaults
  const seenOrder: string[] = []
  const byExercise = new Map<string, SetRow>()
  for (const r of rows) {
    if (!byExercise.has(r.exercise_id)) seenOrder.push(r.exercise_id)
    byExercise.set(r.exercise_id, r) // latest set ends up here
  }

  const exercises: TemplateExercise[] = []
  for (const id of seenOrder) {
    const row = byExercise.get(id)
    if (!row || !row.exercises) continue
    exercises.push({
      exercise_id: row.exercise_id,
      name: row.exercises.name,
      name_ru: row.exercises.name_ru,
      default_weight_kg: row.weight_kg,
      default_reps: row.reps,
    })
  }

  if (exercises.length === 0) {
    throw new Error('Source session has no exercises')
  }

  // Create one-off template named after source date
  const sourceDate = new Date(source.started_at).toISOString().slice(0, 10)
  const template = await createTemplate(supabase, user.id, `↻ ${sourceDate}`, exercises)

  // Start session (or resume existing)
  const active = await getActiveSession(supabase, user.id)
  if (active) {
    redirect(`/workout/${active.id}?template=${template.id}`)
  }
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}?template=${template.id}`)
}
