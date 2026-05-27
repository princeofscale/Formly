import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { getExercises } from '@/lib/db/exercises'
import { getGoalsWithProgress } from '@/lib/db/goals'
import { GoalForm } from '@/components/goals/GoalForm'
import { GoalList } from '@/components/goals/GoalList'

type Tab = 'active' | 'done' | 'all'

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabRaw } = await searchParams
  const tab: Tab = tabRaw === 'done' || tabRaw === 'all' ? tabRaw : 'active'

  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('goals')

  const [exercises, goals] = await Promise.all([
    getExercises(supabase, user.id),
    getGoalsWithProgress(supabase, user.id),
  ])

  const exerciseOptions = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    name_ru: e.name_ru ?? null,
  }))

  const activeCount = goals.filter((g) => !g.achieved_at).length
  const doneCount = goals.filter((g) => !!g.achieved_at).length

  return (
    <div className="space-y-3 pb-4">
      {/* Title + badge */}
      <div className="tar-d-rise tar-d-rise-1 tar-g-head">
        <h1>{t('title')}</h1>
        {goals.length > 0 && (
          <span className="tar-g-badge">
            <span className="dot" />
            {t('badge', { active: activeCount, done: doneCount })}
          </span>
        )}
      </div>

      {/* New-goal CTA */}
      <details className="tar-d-rise tar-d-rise-2">
        <summary className="tar-g-new list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <span className="tar-g-new-inner">
            <span className="tar-g-new-ico">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="tar-g-new-text">
              <span className="t block">{t('newGoalTitle')}</span>
              <span className="s block">{t('newGoalSub')}</span>
            </span>
            <span className="tar-g-new-arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </span>
        </summary>
        <div className="mt-3">
          <GoalForm exercises={exerciseOptions} />
        </div>
      </details>

      {/* Tabs (only if there's something to filter) */}
      {goals.length > 0 && (
        <div
          className="tar-s-tabs tar-d-rise tar-d-rise-3"
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
        >
          <a href="/goals" className={tab === 'active' ? 'on' : ''}>
            {t('tabs.active')}
          </a>
          <a href="/goals?tab=done" className={tab === 'done' ? 'on' : ''}>
            {t('tabs.done')}
          </a>
          <a href="/goals?tab=all" className={tab === 'all' ? 'on' : ''}>
            {t('tabs.all')}
          </a>
        </div>
      )}

      <GoalList goals={goals} tab={tab} />
    </div>
  )
}
