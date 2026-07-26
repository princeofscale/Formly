'use server'

import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import {
  getCoachThread,
  appendCoachMessages,
  trimConversation,
  CONTEXT_MESSAGE_LIMIT,
} from '@/lib/db/coach'
import type { CoachMessage } from '@/lib/db/coach'
import { askCoach } from '@/lib/services/coach-chat.service'
import { buildTrainingSnapshot } from '@/lib/services/training-snapshot.service'
import { consumeAiQuota, AiQuotaExceededError } from '@/lib/services/ai-quota.service'

export type AskResult = { ok: true } | { ok: false; reason: 'empty' | 'quota' | 'failed' }

export async function askCoachAction(formData: FormData): Promise<AskResult> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const question = String(formData.get('question') ?? '').trim()
  if (!question || question.length > 1000) return { ok: false, reason: 'empty' }

  try {
    await consumeAiQuota(supabase, 'coach_chat')
  } catch (error) {
    if (error instanceof AiQuotaExceededError) return { ok: false, reason: 'quota' }
    throw error
  }

  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  const thread = await getCoachThread(supabase, user.id)
  const snapshot = await buildTrainingSnapshot(supabase, user.id, locale)

  const reply = await askCoach({
    locale,
    question,
    conversation: trimConversation(thread, CONTEXT_MESSAGE_LIMIT),
    snapshot,
  })

  if (!reply) return { ok: false, reason: 'failed' }

  await appendCoachMessages(supabase, user.id, question, reply)
  revalidatePath('/coach')
  return { ok: true }
}

export async function getCoachThreadAction(): Promise<CoachMessage[]> {
  const { user } = await verifySession()
  const supabase = await createClient()
  return getCoachThread(supabase, user.id)
}
