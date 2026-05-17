'use client'

import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { StreakInfo, DayActivity } from '@/lib/types/models'

interface Props {
  streak: StreakInfo
  activity?: DayActivity[]
}

export function StreakCard({ streak }: Props) {
  const t = useTranslations('streak')

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
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-white/30">{t('best')}</div>
          <div className="text-sm font-bold text-white/75 tabular-nums">{streak.longest}</div>
        </div>
      </CardContent>
    </Card>
  )
}
