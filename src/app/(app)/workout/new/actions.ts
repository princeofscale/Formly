'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createSession, getActiveSession } from '@/lib/db/workouts'
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  getSessionExerciseList,
  updateTemplate,
} from '@/lib/db/templates'
import { verifySession } from '@/lib/dal'
import { findPresetDay } from '@/lib/constants/workout-presets'
import type { TemplateExercise } from '@/lib/types/models'

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

// One-click "repeat workout from history": rebuilds the rolling `🔁 Repeat`
// template with the source session's exercises (in original order) and starts
// a new session pointing at it. Pre-fills weights via existing template flow.
export async function repeatSessionAction(formData: FormData): Promise<void> {
  const sessionId = formData.get('sessionId')?.toString()
  if (!sessionId) return

  const { user } = await verifySession()
  const supabase = await createClient()

  const exercises = await getSessionExerciseList(supabase, user.id, sessionId)
  if (exercises.length === 0) {
    redirect('/workout/new')
  }

  const REPEAT_TEMPLATE_NAME = '🔁 Repeat'
  const existing = await getTemplates(supabase, user.id)
  const rolling = existing.find((t) => t.name === REPEAT_TEMPLATE_NAME)

  let templateId: string
  if (rolling) {
    await updateTemplate(supabase, user.id, rolling.id, exercises)
    templateId = rolling.id
  } else {
    const created = await createTemplate(supabase, user.id, REPEAT_TEMPLATE_NAME, exercises)
    templateId = created.id
  }

  const active = await getActiveSession(supabase, user.id)
  if (active) {
    redirect(`/workout/${active.id}?template=${templateId}`)
  }
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}?template=${templateId}`)
}

export async function startFromPresetAction(formData: FormData): Promise<void> {
  const dayId = formData.get('dayId')?.toString()
  if (!dayId) return

  const match = findPresetDay(dayId)
  if (!match) return

  const { user } = await verifySession()
  const supabase = await createClient()
  const tPresets = await getTranslations('presets')

  // Fetch exercises by slug, plus user's existing templates (parallel)
  const [exerciseResult, existingTemplates] = await Promise.all([
    supabase.from('exercises').select('id, name, name_ru, slug').in('slug', match.day.slugs),
    getTemplates(supabase, user.id),
  ])

  const exerciseRows = (exerciseResult.data ?? []) as Array<{
    id: string
    name: string
    name_ru: string | null
    slug: string
  }>

  // Preserve preset order — exercises returned by IN clause may be out of order
  const exerciseBySlug = new Map(exerciseRows.map((e) => [e.slug, e]))
  const orderedExercises: TemplateExercise[] = []
  for (const slug of match.day.slugs) {
    const ex = exerciseBySlug.get(slug)
    if (!ex) continue
    orderedExercises.push({
      exercise_id: ex.id,
      name: ex.name,
      name_ru: ex.name_ru,
    })
  }

  if (orderedExercises.length === 0) return

  // Template name: "Фулбади · День A" / "Full Body · Day A"
  const programTitle = tPresets(`${match.program.id}.title`)
  const dayTitle = tPresets(match.day.titleKey)
  const templateName = `${programTitle} · ${dayTitle}`

  // Re-use existing template with this exact name if present, otherwise create
  let templateId = existingTemplates.find((t) => t.name === templateName)?.id
  if (!templateId) {
    const created = await createTemplate(supabase, user.id, templateName, orderedExercises)
    templateId = created.id
  }

  // Start session (or resume existing)
  const active = await getActiveSession(supabase, user.id)
  if (active) {
    redirect(`/workout/${active.id}?template=${templateId}`)
  }
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}?template=${templateId}`)
}
