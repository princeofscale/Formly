'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trophy } from 'lucide-react'
import type { RecentPR } from '@/lib/db/prs'

interface Props {
  prs: RecentPR[]
  windowDays: number
}

export function PRsCard({ prs, windowDays }: Props) {
  const t = useTranslations('dashboard.prs')
  const locale = useLocale()

  if (prs.length === 0) {
    return (
      <div
        className="rounded-[20px] p-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Trophy className="h-4 w-4 text-white/35" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              {t('label')}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white/55">{t('empty')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 196, 68, 0.06), rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 196, 68, 0.20)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255, 196, 68, 0.16)' }}
          >
            <Trophy className="h-4 w-4" style={{ color: '#FFC044' }} />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#FFC044' }}
            >
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title', { days: windowDays })}</p>
          </div>
        </div>
        <span className="text-xs font-mono tabular-nums text-white/40">{prs.length}</span>
      </div>

      <div className="space-y-2">
        {prs.slice(0, 5).map((pr) => {
          const name =
            locale === 'ru' ? (pr.exercise_name_ru ?? pr.exercise_name) : pr.exercise_name
          const isFirst = pr.improvement_pct === null
          const date = new Date(pr.achieved_at)
          const dateLabel = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <div
              key={pr.exercise_id}
              className="flex items-center gap-3 p-2.5 -mx-1 rounded-[12px]"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45 tabular-nums">
                  <span>
                    {pr.weight_kg.toFixed(1)} × {pr.reps}
                  </span>
                  <span className="text-white/25">·</span>
                  <span>{dateLabel}</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-sm font-bold tabular-nums" style={{ color: '#FFC044' }}>
                  {pr.current_best.toFixed(1)}
                </span>
                <span
                  className="text-[10px] tabular-nums"
                  style={{ color: isFirst ? '#22D3A8' : '#FFC044' }}
                >
                  {isFirst ? t('firstRecord') : `+${pr.improvement_pct!.toFixed(1)}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
        {t('hint')}
      </p>
    </div>
  )
}
