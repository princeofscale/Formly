'use client'

import { useTranslations } from 'next-intl'
import { Flame, Snowflake } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { StreakInfo, DayActivity } from '@/lib/types/models'

interface Props {
  streak: StreakInfo
  activity?: DayActivity[]
}

export function StreakCard({ streak }: Props) {
  const t = useTranslations('streak')

  const freezesPerMonth = streak.freezes_per_month ?? 0
  const freezesUsed = streak.freezes_used_this_month ?? 0
  const freezesLeft = Math.max(0, freezesPerMonth - freezesUsed)
  const showFreeze = freezesPerMonth > 0

  return (
    <Card size="sm" className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black leading-none text-primary tabular-nums">
              {streak.current}
            </span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
              {t('label')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showFreeze && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md"
              style={{
                background: freezesLeft > 0 ? 'rgba(94, 234, 212, 0.10)' : 'rgba(255,255,255,0.04)',
                border: freezesLeft > 0 ? '1px solid rgba(94, 234, 212, 0.28)' : '1px solid rgba(255,255,255,0.06)',
              }}
              title={t('freezeTooltip', { used: freezesUsed, total: freezesPerMonth })}
            >
              <Snowflake
                className="h-3 w-3"
                style={{ color: freezesLeft > 0 ? '#5EEAD4' : 'rgba(255,255,255,0.30)' }}
              />
              <span
                className="text-[10px] font-mono font-bold tabular-nums"
                style={{ color: freezesLeft > 0 ? '#5EEAD4' : 'rgba(255,255,255,0.40)' }}
              >
                {freezesLeft}/{freezesPerMonth}
              </span>
            </div>
          )}
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-widest text-white/30">{t('best')}</div>
            <div className="text-sm font-bold text-white/75 tabular-nums">{streak.longest}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
