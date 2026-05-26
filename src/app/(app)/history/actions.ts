'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createSession, getActiveSession } from '@/lib/db/workouts'
import { createTemplate } from '@/lib/db/templates'
import { getSessionSummary } from '@/lib/services/session-summary.service'
import { generateDebrief, type SessionDebrief } from '@/lib/services/session-debrief.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'
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

export async function getOrGenerateSessionDebriefAction(
  sessionId: string,
): Promise<SessionDebrief | null> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: sessionRaw } = await supabase
    .from('workout_sessions')
    // ai_debrief column was added via migration but isn't in the generated
    // Database types yet — cast through unknown to keep TS happy.
    .select('user_id, finished_at, ai_debrief')
    .eq('id', sessionId)
    .single()

  const session = sessionRaw as unknown as {
    user_id: string
    finished_at: string | null
    ai_debrief: unknown
  } | null

  if (!session || session.user_id !== user.id) return null
  if (!session.finished_at) return null

  // Cached
  if (session.ai_debrief && typeof session.ai_debrief === 'object') {
    const cached = session.ai_debrief as SessionDebrief
    if (Array.isArray(cached.items) && cached.items.length > 0) return cached
  }

  const summary = await getSessionSummary(supabase, user.id, sessionId)
  if (!summary || summary.totalSets === 0) return null

  // RPE stats from this session
  const { data: rpeRows } = await supabase
    .from('set_entries')
    .select('rpe')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .not('rpe', 'is', null)

  const rpeValues = ((rpeRows ?? []) as { rpe: number }[]).map((r) => r.rpe)
  const rpe = {
    avg: rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null,
    max: rpeValues.length > 0 ? Math.max(...rpeValues) : null,
    samples: rpeValues.length,
  }

  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, user.id, 'session_debrief')
  } catch (e) {
    if (e instanceof AiQuotaExceededError) return null
    throw e
  }

  let debrief: SessionDebrief
  try {
    debrief = await generateDebrief({ locale, summary, rpe })
  } catch {
    return null
  }

  if (debrief.items.length === 0) return null

  // Cache for future loads. Bypass generated types since ai_debrief is a
  // newly-added column not yet reflected in Database typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('workout_sessions') as any)
    .update({ ai_debrief: debrief })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  return debrief
}
