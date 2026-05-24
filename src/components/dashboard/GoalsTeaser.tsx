'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Target, ChevronRight } from 'lucide-react'
import type { GoalWithProgress } from '@/lib/db/goals'
import { weightUnit } from '@/lib/units'

interface Props {
  goals: GoalWithProgress[]
}

export function GoalsTeaser({ goals }: Props) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const kg = weightUnit(locale)

  // Show up to 2 active goals, sorted by progress desc
  const active = goals
    .filter((g) => !g.achieved_at)
    .sort((a, b) => b.progress_pct - a.progress_pct)
    .slice(0, 2)

  if (goals.length === 0) {
    return (
      <Link
        href="/goals"
        className="block rounded-[20px] p-4 transition hover:bg-white/[0.04]"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255, 196, 68, 0.16)' }}
          >
            <Target className="h-4 w-4" style={{ color: '#FFC044' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#FFC044' }}
            >
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('setFirst')}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <Link
      href="/goals"
      className="block rounded-[20px] p-5 space-y-3 transition hover:bg-white/[0.02]"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 196, 68, 0.16)' }}
          >
            <Target className="h-4 w-4" style={{ color: '#FFC044' }} />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#FFC044' }}
            >
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('teaserTitle')}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>

      <div className="space-y-2.5">
        {active.length === 0 ? (
          <p className="text-xs text-white/45">{t('allAchieved')}</p>
        ) : (
          active.map((g) => {
            const name = locale === 'ru' ? (g.exercise_name_ru ?? g.exercise_name) : g.exercise_name
            const barColor = g.progress_pct >= 80 ? '#FFC044' : '#FF6E76'
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                  <span className="text-white font-bold truncate">{name}</span>
                  <span style={{ color: barColor }} className="font-bold shrink-0">
                    {g.current_e1rm.toFixed(0)} → {g.target_e1rm.toFixed(0)} {kg}
                  </span>
                </div>
                <div
                  className="relative h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${g.progress_pct}%`, background: barColor }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </Link>
  )
}
