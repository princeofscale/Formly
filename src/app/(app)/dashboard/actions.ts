'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import type { AIInsights } from '@/lib/types/models'

export async function refreshAIInsightsAction(goal?: string): Promise<AIInsights> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  const [weeklyVolumes, profileResult, sessionsResult, prsResult] = await Promise.all([
    getWeeklyMuscleVolume(supabase, user.id),
    supabase
      .from('profiles')
      .select('age, training_since')
      .eq('id', user.id)
      .single(),
    supabase
      .from('workout_sessions')
      .select('started_at, total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(7),
    supabase
      .from('set_entries')
      .select('calculated_1rm, exercises(name, name_ru)')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(5),
  ])

  const volumeLandmarks = getVolumeLandmarks(weeklyVolumes)

  const insights = await generateInsights({
    locale,
    profile: {
      age: profileResult.data?.age ?? null,
      training_since: profileResult.data?.training_since ?? null,
      goal: goal ?? null,
    },
    weekly_volumes: weeklyVolumes,
    volume_landmarks: volumeLandmarks,
    recent_sessions: (sessionsResult.data ?? []).map(s => ({
      date: s.started_at.slice(0, 10),
      volume_kg: s.total_volume_kg,
    })),
    top_prs: (prsResult.data ?? []).map(r => {
      const ex = r.exercises as { name: string; name_ru?: string | null } | null
      return {
        exercise: (locale === 'ru' ? ex?.name_ru ?? ex?.name : ex?.name) ?? '',
        e1rm: r.calculated_1rm ?? 0,
      }
    }),
    progression_opportunities: [],
  })

  await saveInsights(supabase, user.id, insights)
  return insights
}
