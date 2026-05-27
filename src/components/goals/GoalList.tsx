'use client'

import { useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Check, Dumbbell, Trash2 } from 'lucide-react'
import { deleteGoalAction } from '@/app/(app)/goals/actions'
import type { GoalWithProgress } from '@/lib/db/goals'
import { weightUnit } from '@/lib/units'

interface Props {
  goals: GoalWithProgress[]
  tab: 'active' | 'done' | 'all'
}

interface PreparedGoal {
  goal: GoalWithProgress
  daysRemaining: number | null
}

function prepareGoals(filtered: GoalWithProgress[]): PreparedGoal[] {
  const now = Date.now()
  return [...filtered]
    .sort((a, b) => {
      if (!!a.achieved_at !== !!b.achieved_at) return a.achieved_at ? 1 : -1
      if (a.achieved_at && b.achieved_at) {
        return new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()
      }
      return b.progress_pct - a.progress_pct
    })
    .map((g) => {
      let daysRemaining: number | null = null
      if (!g.achieved_at && g.target_date) {
        const ms = new Date(g.target_date + 'T00:00:00').getTime() - now
        daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
      }
      return { goal: g, daysRemaining }
    })
}

export function GoalList({ goals, tab }: Props) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const filtered = useMemo(() => {
    if (tab === 'active') return goals.filter((g) => !g.achieved_at)
    if (tab === 'done') return goals.filter((g) => !!g.achieved_at)
    return goals
  }, [goals, tab])

  // Prep work goes through a top-level helper so Date.now() stays outside
  // the React Compiler-tracked render path.
  const sorted = useMemo(() => prepareGoals(filtered), [filtered])

  if (goals.length === 0) {
    return (
      <div className="tar-pl-empty tar-d-rise tar-d-rise-4">
        <div className="plus">
          <Dumbbell />
        </div>
        <div className="t">{t('empty')}</div>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="tar-pl-empty tar-d-rise tar-d-rise-4">
        <div className="t">{tab === 'done' ? t('noneDone') : t('allAchieved')}</div>
      </div>
    )
  }

  return (
    <div className="tar-g-list tar-d-rise tar-d-rise-4">
      {sorted.map(({ goal: g, daysRemaining }) => {
        const name = locale === 'ru' ? (g.exercise_name_ru ?? g.exercise_name) : g.exercise_name
        const isDone = !!g.achieved_at
        const pct = Math.max(0, Math.min(100, g.progress_pct))
        const ringFill = isDone
          ? `conic-gradient(from -90deg, #2BD884 0%, #2BD884 100%)`
          : `conic-gradient(from -90deg, #FF6B35 0%, #FFB627 ${pct}%, rgba(255,255,255,0.05) ${pct}%)`

        const achievedDateLabel = g.achieved_at
          ? new Date(g.achieved_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
              day: 'numeric',
              month: 'short',
            })
          : null

        return (
          <div key={g.id} className={`tar-g-card${isDone ? ' done' : ''}`}>
            <div className="tar-g-ring">
              <div className="tar-g-ring-fill" style={{ background: ringFill }} />
              <div className="tar-g-ring-hole">
                {isDone ? (
                  <>
                    <Check className="h-4 w-4" style={{ color: '#2BD884' }} strokeWidth={3} />
                    <div className="tar-g-ring-lbl">{t('ringDone')}</div>
                  </>
                ) : (
                  <>
                    <div className="tar-g-ring-pct">{Math.round(pct)}%</div>
                    <div className="tar-g-ring-lbl">{t('ringDone')}</div>
                  </>
                )}
              </div>
            </div>
            <div className="tar-g-body">
              <div className="tar-g-type">
                <Dumbbell />
                <span className="tar-g-type-lbl">{t('strengthTarget')}</span>
              </div>
              <div className="tar-g-name">{name}</div>
              <div className="tar-g-vals">
                <span className="cur">{g.current_e1rm.toFixed(0)}</span>
                <span className="sep">/</span>
                <span className="tgt">
                  {g.target_e1rm.toFixed(0)} {kg}
                </span>
              </div>
              <div className="tar-g-remaining">
                {isDone ? (
                  <span className="tar-g-donetag">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    {achievedDateLabel
                      ? t('completedOn', { date: achievedDateLabel })
                      : t('ringDone')}
                  </span>
                ) : daysRemaining !== null ? (
                  t.rich('remainingDays', {
                    n: daysRemaining,
                    days: (ch) => <span className="days">{ch}</span>,
                  })
                ) : (
                  t('noDeadline')
                )}
              </div>
              <div className="tar-g-actions">
                <form action={deleteGoalAction}>
                  <input type="hidden" name="goalId" value={g.id} />
                  <button type="submit" aria-label={t('delete')}>
                    <Trash2 />
                    {t('delete')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
