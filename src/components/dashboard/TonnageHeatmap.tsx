'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Activity } from 'lucide-react'

interface Props {
  daily: { date: string; tonnage_kg: number }[]  // YYYY-MM-DD
  weeks?: number
}

const WEEKDAYS_ISO = [1, 2, 3, 4, 5, 6, 7]  // Mon..Sun

function isoDayOfWeek(d: Date): number {
  const dow = d.getUTCDay()
  return dow === 0 ? 7 : dow
}

function startOfWeekISO(date: Date): Date {
  const d = new Date(date)
  const day = isoDayOfWeek(d)
  d.setUTCDate(d.getUTCDate() - (day - 1))
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function TonnageHeatmap({ daily, weeks = 12 }: Props) {
  const t = useTranslations('dashboard.heatmap')
  const locale = useLocale()
  const [hover, setHover] = useState<{ date: string; tonnage: number } | null>(null)

  const data = useMemo(() => {
    const byDate = new Map(daily.map(d => [d.date, d.tonnage_kg]))
    const maxTon = Math.max(1, ...daily.map(d => d.tonnage_kg))

    const end = new Date()
    const firstWeekStart = startOfWeekISO(end)
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - (weeks - 1) * 7)

    const cells: { date: string; tonnage: number; weekIdx: number; dayIdx: number; isFuture: boolean }[] = []
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cur = new Date(firstWeekStart)
        cur.setUTCDate(firstWeekStart.getUTCDate() + w * 7 + d)
        const iso = cur.toISOString().slice(0, 10)
        const isFuture = cur > end
        cells.push({
          date: iso,
          tonnage: byDate.get(iso) ?? 0,
          weekIdx: w,
          dayIdx: d,
          isFuture,
        })
      }
    }
    return { cells, maxTon }
  }, [daily, weeks])

  function bucketColor(tonnage: number, isFuture: boolean): string {
    if (isFuture) return 'rgba(255, 255, 255, 0.02)'
    if (tonnage === 0) return 'rgba(255, 255, 255, 0.04)'
    const ratio = Math.min(1, tonnage / data.maxTon)
    // 4 buckets like GitHub
    if (ratio < 0.25) return 'rgba(255, 59, 71, 0.25)'
    if (ratio < 0.5) return 'rgba(255, 59, 71, 0.5)'
    if (ratio < 0.75) return 'rgba(255, 59, 71, 0.75)'
    return '#FF3B47'
  }

  const dayLabels: Record<number, string> = {
    1: t('days.mon'),
    3: t('days.wed'),
    5: t('days.fri'),
    7: t('days.sun'),
  }

  function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short',
    })
  }

  // Month labels — show first cell of each new month at the top
  const monthLabels: { weekIdx: number; label: string }[] = []
  let prevMonth = -1
  for (let w = 0; w < weeks; w++) {
    const firstDay = data.cells.find(c => c.weekIdx === w && c.dayIdx === 0)
    if (!firstDay) continue
    const month = new Date(firstDay.date + 'T00:00:00').getMonth()
    if (month !== prevMonth) {
      monthLabels.push({
        weekIdx: w,
        label: new Date(firstDay.date + 'T00:00:00').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' }),
      })
      prevMonth = month
    }
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255, 59, 71, 0.12)' }}
          >
            <Activity className="h-4 w-4" style={{ color: '#FF6E76' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FF6E76' }}>
              {t('label', { weeks })}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        {hover ? (
          <div className="text-right">
            <p className="font-mono text-[11px] tabular-nums text-white">
              {hover.tonnage.toLocaleString()} {t('unit')}
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(hover.date)}</p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{t('hint')}</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto" onMouseLeave={() => setHover(null)}>
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-7 relative" style={{ height: 12 }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[9px] uppercase tracking-wider absolute"
                style={{
                  left: m.weekIdx * 15,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid: rows = days, cols = weeks */}
          <div className="flex gap-1">
            <div className="flex flex-col gap-[3px] justify-between pr-1 text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', height: 7 * 15 - 3 }}>
              {WEEKDAYS_ISO.map(d => (
                <div key={d} className="h-3 flex items-center">{dayLabels[d] ?? ''}</div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: weeks }).map((_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {WEEKDAYS_ISO.map((_d, dIdx) => {
                    const cell = data.cells.find(c => c.weekIdx === w && c.dayIdx === dIdx)
                    if (!cell) return null
                    return (
                      <div
                        key={dIdx}
                        className="w-3 h-3 rounded-[3px] cursor-default transition-transform hover:scale-125"
                        style={{
                          background: bucketColor(cell.tonnage, cell.isFuture),
                          border: cell.isFuture ? '1px dashed rgba(255,255,255,0.05)' : 'none',
                        }}
                        onMouseEnter={() => !cell.isFuture && setHover({ date: cell.date, tonnage: cell.tonnage })}
                        title={cell.isFuture ? '' : `${formatDate(cell.date)}: ${cell.tonnage.toLocaleString()} ${t('unit')}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 ml-7 text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span>{t('less')}</span>
            <div className="w-3 h-3 rounded-[3px]" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            <div className="w-3 h-3 rounded-[3px]" style={{ background: 'rgba(255, 59, 71, 0.25)' }} />
            <div className="w-3 h-3 rounded-[3px]" style={{ background: 'rgba(255, 59, 71, 0.5)' }} />
            <div className="w-3 h-3 rounded-[3px]" style={{ background: 'rgba(255, 59, 71, 0.75)' }} />
            <div className="w-3 h-3 rounded-[3px]" style={{ background: '#FF3B47' }} />
            <span>{t('more')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
