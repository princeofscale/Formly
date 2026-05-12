'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createSession, getActiveSession } from '@/lib/db/workouts'
import { deleteTemplate } from '@/lib/db/templates'
import { verifySession } from '@/lib/dal'

export async function startWorkoutAction(): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const active = await getActiveSession(supabase, user.id)
  if (active) redirect(`/workout/${active.id}`)
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}`)
}

export async function startFromTemplateAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const templateId = formData.get('templateId')?.toString()
  const active = await getActiveSession(supabase, user.id)
  if (active) redirect(`/workout/${active.id}${templateId ? `?template=${templateId}` : ''}`)
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}${templateId ? `?template=${templateId}` : ''}`)
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const templateId = formData.get('templateId')?.toString()
  if (!templateId) return
  await deleteTemplate(supabase, user.id, templateId)
  revalidatePath('/workout/new')
}
