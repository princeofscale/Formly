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

interface Props {
  code: AchievementCode
  unlockedAt: string | null
}

export function AchievementCard({ code, unlockedAt }: Props) {
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

  return (
    <div
      className={`p-4 rounded-xl transition-opacity ${isUnlocked ? '' : 'opacity-40'}`}
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
      {dateStr && (
        <div className="text-[9px] text-zinc-600 mt-2 uppercase tracking-wide">
          {t('received')} {dateStr}
        </div>
      )}
    </div>
  )
}
