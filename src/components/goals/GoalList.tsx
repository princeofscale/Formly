'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trash2, Check } from 'lucide-react'
import { deleteGoalAction } from '@/app/(app)/goals/actions'
import type { GoalWithProgress } from '@/lib/db/goals'
import { weightUnit } from '@/lib/units'

interface Props {
  goals: GoalWithProgress[]
}

export function GoalList({ goals }: Props) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const kg = weightUnit(locale)

  if (goals.length === 0) {
    return (
      <div
        className="rounded-[20px] p-5 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-sm text-white/45">{t('empty')}</p>
      </div>
    )
  }

  // Sort: active first (by progress desc), then achieved at the bottom
  const sorted = [...goals].sort((a, b) => {
    if (!!a.achieved_at !== !!b.achieved_at) return a.achieved_at ? 1 : -1
    return b.progress_pct - a.progress_pct
  })

  return (
    <div className="space-y-3">
      {sorted.map((g) => {
        const name = locale === 'ru' ? (g.exercise_name_ru ?? g.exercise_name) : g.exercise_name
        const isDone = !!g.achieved_at
        const targetDateLabel = g.target_date
          ? new Date(g.target_date + 'T00:00:00').toLocaleDateString(
              locale === 'ru' ? 'ru-RU' : 'en-US',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              },
            )
          : null
        const achievedDateLabel = g.achieved_at
          ? new Date(g.achieved_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
              day: 'numeric',
              month: 'short',
            })
          : null

        const barColor = isDone ? '#22D3A8' : g.progress_pct >= 80 ? '#FFC044' : '#FF6E76'

        return (
          <div
            key={g.id}
            className="rounded-[16px] p-4"
            style={{
              background: isDone ? 'rgba(34, 211, 168, 0.06)' : '#15151C',
              border: isDone
                ? '1px solid rgba(34, 211, 168, 0.24)'
                : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {isDone && <Check className="h-4 w-4 shrink-0" style={{ color: '#22D3A8' }} />}
                <p className="text-sm font-bold text-white truncate">{name}</p>
              </div>
              <form action={deleteGoalAction}>
                <input type="hidden" name="goalId" value={g.id} />
                <button
                  type="submit"
                  aria-label={t('delete')}
                  className="text-white/30 hover:text-red-300 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            <div className="flex items-baseline justify-between mb-1.5 text-xs tabular-nums">
              <span style={{ color: barColor }} className="font-bold">
                {g.current_e1rm.toFixed(0)} → {g.target_e1rm.toFixed(0)} {kg}
              </span>
              <span className="text-white/55">
                {isDone
                  ? achievedDateLabel
                    ? `✓ ${achievedDateLabel}`
                    : '✓'
                  : `${g.progress_pct.toFixed(0)}%`}
              </span>
            </div>

            <div
              className="relative h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${g.progress_pct}%`, background: barColor }}
              />
            </div>

            {targetDateLabel && !isDone && (
              <p className="mt-2 text-[10px] text-white/40">
                {t('targetBy', { date: targetDateLabel })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
