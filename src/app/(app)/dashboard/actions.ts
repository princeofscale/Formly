'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { buildTrainingSnapshot } from '@/lib/services/training-snapshot.service'
import type { AIInsights } from '@/lib/types/models'

export async function refreshAIInsightsAction(goal?: string): Promise<AIInsights> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  const ctx = await buildTrainingSnapshot(supabase, user.id, locale, goal)
  const insights = await generateInsights(ctx)

  await saveInsights(supabase, user.id, insights)
  return insights
}
