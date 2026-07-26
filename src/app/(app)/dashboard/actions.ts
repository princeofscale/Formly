'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { buildTrainingSnapshot } from '@/lib/services/training-snapshot.service'
import type { AIInsights } from '@/lib/types/models'
import { z } from 'zod'
import { consumeAiQuota } from '@/lib/services/ai-quota.service'

export async function refreshAIInsightsAction(goal?: string): Promise<AIInsights> {
  const safeGoal = z.string().trim().max(200).optional().parse(goal)
  const { user } = await verifySession()
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  await consumeAiQuota(supabase, 'insights_refresh')
  const ctx = await buildTrainingSnapshot(supabase, user.id, locale, safeGoal)
  const insights = await generateInsights(ctx)

  await saveInsights(supabase, user.id, insights)
  return insights
}
