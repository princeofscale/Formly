'use client'

import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { StreakInfo, DayActivity } from '@/lib/types/models'

function cellColor(sets: number): string {
  if (sets === 0) return 'bg-white/5'
  if (sets <= 5) return 'bg-amber-500/30'
  if (sets <= 15) return 'bg-amber-500/60'
  return 'bg-amber-500'
}

interface HeatmapProps {
  activity: DayActivity[]
  setsLabel: string
}

function CalendarHeatmap({ activity, setsLabel }: HeatmapProps) {
  const todayIso = new Date().toISOString().slice(0, 10)

  const cells: (DayActivity & { col: number; row: number })[] = activity.map((d, i) => {
    const date = new Date(d.date + 'T00:00:00Z')
    const dow = date.getUTCDay()
    const row = dow === 0 ? 6 : dow - 1
    const col = Math.floor(i / 7)
    return { ...d, col, row }
  })

  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 12 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, row) => {
            const cell = cells.find(c => c.col === col && c.row === row)
            if (!cell) return <div key={row} className="aspect-square" />
            const isToday = cell.date === todayIso
            return (
              <div
                key={row}
                title={`${cell.date} · ${cell.sets} ${setsLabel}`}
                className={`aspect-square rounded-sm ${cellColor(cell.sets)} ${
                  isToday ? 'ring-1 ring-amber-500/70' : ''
                }`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface Props {
  streak: StreakInfo
  activity: DayActivity[]
}

export function StreakCard({ streak, activity }: Props) {
  const t = useTranslations('streak')
  const th = useTranslations('history')

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-7 w-7 text-orange-400" />
            <div>
              <div className="text-4xl font-black text-amber-500 leading-none tabular-nums">
                {streak.current}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                {t('label')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{t('best')}</div>
            <div className="text-sm font-bold text-zinc-300 tabular-nums">{streak.longest}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CalendarHeatmap activity={activity} setsLabel={th('sets')} />
      </CardContent>
    </Card>
  )
}
