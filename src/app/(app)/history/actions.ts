'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createSession, getActiveSession } from '@/lib/db/workouts'
import { createTemplate } from '@/lib/db/templates'
import { getSessionSummary } from '@/lib/services/session-summary.service'
import { generateDebrief, type SessionDebrief } from '@/lib/services/session-debrief.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'
import { createWorkoutShare } from '@/lib/services/workout-share.service'
import type { TemplateExercise } from '@/lib/types/models'
import { validateUuid } from '@/lib/utils/validators'
import type { Json } from '@/lib/types/database.types'

/**
 * Publishes a finished workout as a card anyone with the link can load.
 *
 * Returns the absolute URL because the caller puts it on the clipboard. The
 * origin comes from the request rather than a constant so a preview
 * deployment hands out its own links instead of production's.
 */
export async function shareWorkoutAction(sessionId: string): Promise<string | null> {
  const id = validateUuid(sessionId, 'sessionId')
  const { user } = await verifySession()
  const supabase = await createClient()

  const share = await createWorkoutShare(supabase, user.id, id)
  if (!share) return null

  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  if (!host) return null
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'

  return `${protocol}://${host}/api/og/share/${share.token}`
}

export async function revokeWorkoutShareAction(sessionId: string): Promise<void> {
  const id = validateUuid(sessionId, 'sessionId')
  const { user } = await verifySession()
  const supabase = await createClient()

  await supabase
    .from('workout_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
}

export async function deleteSessionAction(sessionId: string) {
  const id = validateUuid(sessionId, 'sessionId')
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!session || session.user_id !== user.id) {
    throw new Error('Not found')
  }

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

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
  const sourceId = validateUuid(sourceSessionId, 'sourceSessionId')
  const { user } = await verifySession()
  const supabase = await createClient()

  // Verify ownership of source session
  const { data: source } = await supabase
    .from('workout_sessions')
    .select('user_id, started_at')
    .eq('id', sourceId)
    .single()
  if (!source || source.user_id !== user.id) {
    throw new Error('Source session not found')
  }

  // Get all sets with exercise data, in original order
  const { data: setsData } = await supabase
    .from('set_entries')
    .select('exercise_id, set_number, weight_kg, reps, exercises(id, name, name_ru)')
    .eq('session_id', sourceId)
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
  const id = validateUuid(sessionId, 'sessionId')
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: sessionRaw } = await supabase
    .from('workout_sessions')
    // ai_debrief column was added via migration but isn't in the generated
    // Database types yet — cast through unknown to keep TS happy.
    .select('user_id, finished_at, ai_debrief')
    .eq('id', id)
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

  const summary = await getSessionSummary(supabase, user.id, id)
  if (!summary || summary.totalSets === 0) return null

  // RPE stats from this session
  const { data: rpeRows } = await supabase
    .from('set_entries')
    .select('rpe')
    .eq('user_id', user.id)
    .eq('session_id', id)
    .not('rpe', 'is', null)

  const rpeValues = ((rpeRows ?? []) as { rpe: number }[]).map((r) => r.rpe)
  const rpe = {
    avg: rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null,
    max: rpeValues.length > 0 ? Math.max(...rpeValues) : null,
    samples: rpeValues.length,
  }

  const locale = (await getLocale()) === 'ru' ? 'ru' : 'en'

  try {
    await consumeAiQuota(supabase, 'session_debrief')
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

  await supabase
    .from('workout_sessions')
    .update({ ai_debrief: debrief as unknown as Json })
    .eq('id', id)
    .eq('user_id', user.id)

  return debrief
}
