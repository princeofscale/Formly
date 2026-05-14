'use client'

import { Lock } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { ACHIEVEMENT_META } from '@/lib/services/achievements.service'
import type { AchievementCode } from '@/lib/types/models'

const CATEGORY_BORDER: Record<string, string> = {
  sessions: '#a78bfa',
  tonnage:  '#f59e0b',
  streak:   '#f87171',
  pr:       '#4ade80',
}

export interface AchievementStats {
  totalSessions: number
  totalTonnage: number
  currentStreak: number
  hasPR: boolean
}

function progressFor(code: AchievementCode, stats: AchievementStats): { current: number; target: number } | null {
  switch (code) {
    case 'first_workout':  return { current: Math.min(stats.totalSessions, 1), target: 1 }
    case 'sessions_10':    return { current: Math.min(stats.totalSessions, 10), target: 10 }
    case 'sessions_50':    return { current: Math.min(stats.totalSessions, 50), target: 50 }
    case 'sessions_100':   return { current: Math.min(stats.totalSessions, 100), target: 100 }
    case 'tonnage_1000':   return { current: Math.min(stats.totalTonnage, 1000), target: 1000 }
    case 'tonnage_10000':  return { current: Math.min(stats.totalTonnage, 10000), target: 10000 }
    case 'tonnage_100000': return { current: Math.min(stats.totalTonnage, 100000), target: 100000 }
    case 'streak_7':       return { current: Math.min(stats.currentStreak, 7), target: 7 }
    case 'streak_30':      return { current: Math.min(stats.currentStreak, 30), target: 30 }
    case 'first_pr':       return { current: stats.hasPR ? 1 : 0, target: 1 }
    default:               return null
  }
}

interface Props {
  code: AchievementCode
  unlockedAt: string | null
  stats?: AchievementStats
}

export function AchievementCard({ code, unlockedAt, stats }: Props) {
  const t = useTranslations('achievements')
  const locale = useLocale()
  const meta = ACHIEVEMENT_META[code]
  const isUnlocked = unlockedAt !== null

  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
        day: 'numeric',
        month: 'long',
      })
    : null

  const progress = !isUnlocked && stats ? progressFor(code, stats) : null
  const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0

  return (
    <div
      className={`p-4 rounded-xl transition-opacity ${isUnlocked ? '' : 'opacity-60'}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isUnlocked ? CATEGORY_BORDER[meta.category] + '60' : 'rgba(255,255,255,0.10)'}`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-3xl">{meta.icon}</div>
        {!isUnlocked && <Lock className="h-4 w-4 text-zinc-500" />}
      </div>
      <div className="text-sm font-bold text-white">{t(`items.${code}.title`)}</div>
      <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
        {isUnlocked ? t(`items.${code}.desc`) : t(`items.${code}.condition`)}
      </div>

      {progress && !isUnlocked && (
        <div className="mt-3 space-y-1">
          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: CATEGORY_BORDER[meta.category],
              }}
            />
          </div>
          <div className="text-[9px] font-mono text-zinc-500 tabular-nums">
            {progress.current.toLocaleString()} / {progress.target.toLocaleString()}
          </div>
        </div>
      )}

      {dateStr && (
        <div className="text-[9px] text-zinc-600 mt-2 uppercase tracking-wide">
          {t('received')} {dateStr}
        </div>
      )}
    </div>
  )
}
