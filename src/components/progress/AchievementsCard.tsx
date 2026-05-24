'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trophy } from 'lucide-react'
import type { Achievement } from '@/lib/services/achievements.service'
import { weightUnit } from '@/lib/units'

interface Props {
  achievements: Achievement[]
}

function formatProgress(a: Achievement, locale: string): string {
  if (a.nextTarget == null) return '✓'
  // Strength ratios: show 2-decimal ratio
  if (a.id.startsWith('bench_') || a.id.startsWith('squat_') || a.id.startsWith('deadlift_')) {
    return `${a.current.toFixed(2)}× / ${a.nextTarget.toFixed(2)}×`
  }
  // Counts and tonnages: round
  if (a.id === 'peak_tonnage') {
    return `${Math.round(a.current)} / ${a.nextTarget} ${weightUnit(locale)}`
  }
  return `${Math.floor(a.current)} / ${a.nextTarget}`
}

export function AchievementsCard({ achievements }: Props) {
  const t = useTranslations('progress.achievements')
  const locale = useLocale()

  const earnedCount = achievements.filter(a => a.tier > 0).length

  return (
    <div
      className="rounded-[20px] p-5"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(167, 139, 250, 0.16)' }}
          >
            <Trophy className="h-4 w-4" style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A78BFA' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-white/40">
          {earnedCount} / {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {achievements.map(a => {
          const earned = a.tier > 0
          const tierLabel = a.maxTier > 1 && earned ? ` ${'•'.repeat(a.tier)}` : ''
          const earnedDate = a.earnedAt
            ? new Date(a.earnedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                day: 'numeric', month: 'short',
              })
            : null
          return (
            <div
              key={a.id}
              className="rounded-[12px] p-3 flex flex-col items-center text-center transition"
              style={{
                background: earned ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255,255,255,0.02)',
                border: earned
                  ? '1px solid rgba(167, 139, 250, 0.28)'
                  : '1px solid rgba(255,255,255,0.04)',
                opacity: earned ? 1 : 0.55,
              }}
              title={t(`items.${a.id}.title`)}
            >
              <span className="text-2xl mb-1 leading-none" style={{ filter: earned ? 'none' : 'grayscale(0.8)' }}>
                {a.emoji}
              </span>
              <p className="text-[10px] font-bold text-white leading-tight">
                {t(`items.${a.id}.title`)}{tierLabel}
              </p>
              <p
                className="mt-1 text-[9px] font-mono tabular-nums"
                style={{ color: earned ? '#A78BFA' : 'rgba(255,255,255,0.35)' }}
              >
                {earned && earnedDate ? earnedDate : formatProgress(a, locale)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
