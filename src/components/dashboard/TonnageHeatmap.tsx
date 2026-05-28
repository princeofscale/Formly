'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  daily: { date: string; tonnage_kg: number }[] // YYYY-MM-DD
  weeks?: number
}

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
  const hasData = daily.some((d) => d.tonnage_kg > 0)

  // Bucket the daily totals into `weeks` Monday-anchored weekly bars. A weekly
  // volume trend reads far better than a GitHub-style day grid for lifting:
  // tonnage swings too much for the 4-bucket coloring to mean anything.
  const data = useMemo(() => {
    const byDate = new Map(daily.map((d) => [d.date, d.tonnage_kg]))

    const firstWeekStart = startOfWeekISO(new Date())
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - (weeks - 1) * 7)

    const fmt = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
    })

    const bars: { label: string; weekStart: string; tonnage: number }[] = []
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(firstWeekStart)
      weekStart.setUTCDate(firstWeekStart.getUTCDate() + w * 7)
      let sum = 0
      for (let d = 0; d < 7; d++) {
        const cur = new Date(weekStart)
        cur.setUTCDate(weekStart.getUTCDate() + d)
        sum += byDate.get(cur.toISOString().slice(0, 10)) ?? 0
      }
      bars.push({
        label: fmt.format(weekStart),
        weekStart: weekStart.toISOString().slice(0, 10),
        tonnage: Math.round(sum),
      })
    }
    return bars
  }, [daily, weeks, locale])

  // Header stat: the last *completed* week vs the average of the weeks before
  // it. The final bar is the current, still-in-progress week — comparing it
  // would flash a scary "-60%" every Monday, so we exclude it from the delta.
  const { total, deltaPct } = useMemo(() => {
    const total = data.reduce((s, b) => s + b.tonnage, 0)
    const lastCompleted = data[data.length - 2]?.tonnage ?? 0
    const prior = data.slice(0, -2).filter((b) => b.tonnage > 0)
    const avgPrior = prior.length ? prior.reduce((s, b) => s + b.tonnage, 0) / prior.length : 0
    const deltaPct =
      avgPrior > 0 && lastCompleted > 0
        ? Math.round(((lastCompleted - avgPrior) / avgPrior) * 100)
        : null
    return { total, deltaPct }
  }, [data])

  if (!hasData) {
    return (
      <Link
        href="/workout/new"
        className="block rounded-[20px] p-6 text-center transition active:scale-[0.99]"
        style={{
          background:
            'radial-gradient(140% 90% at 50% 0%, rgba(255, 107, 53, 0.10), transparent 60%), #15151C',
          border: '1px solid rgba(255, 182, 39, 0.16)',
          textDecoration: 'none',
        }}
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: 'rgba(255, 182, 39, 0.12)',
            border: '1px solid rgba(255, 182, 39, 0.3)',
          }}
        >
          <Sparkles className="h-5 w-5" style={{ color: 'var(--tar-brand-2)' }} />
        </div>
        <p className="text-base font-bold text-white">{t('emptyTitle')}</p>
        <p
          className="mt-1.5 text-[13px]"
          style={{ color: 'var(--tar-ink-mute)', lineHeight: 1.45 }}
        >
          {t('emptySub')}
        </p>
      </Link>
    )
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(255, 59, 71, 0.12)' }}
          >
            <Activity className="h-4 w-4" style={{ color: '#FF6E76' }} />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#FF6E76' }}
            >
              {t('label', { weeks })}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[13px] font-bold tabular-nums text-white">
            {total.toLocaleString()} {t('unit')}
          </p>
          {deltaPct !== null && (
            <p
              className="flex items-center justify-end gap-1 text-[11px] font-semibold tabular-nums"
              style={{ color: deltaPct >= 0 ? '#54D6A0' : '#FF6E76' }}
            >
              {deltaPct >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {deltaPct >= 0 ? '+' : ''}
              {deltaPct}% {t('vsAvg')}
            </p>
          )}
        </div>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="tar-tonnage-week-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6E76" />
                <stop offset="100%" stopColor="rgba(255, 59, 71, 0.3)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(245, 241, 232, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: 'rgba(245, 241, 232, 0.42)',
                fontSize: 9,
                fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
              }}
              axisLine={{ stroke: 'rgba(245, 241, 232, 0.08)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{
                fill: 'rgba(245, 241, 232, 0.42)',
                fontSize: 9,
                fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
              }}
              width={44}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#11111a',
                border: '1px solid rgba(245, 241, 232, 0.16)',
                borderRadius: 10,
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(255, 59, 71, 0.08)' }}
              labelFormatter={(label) => `${t('weekOf')} ${label}`}
              formatter={(v) => [`${Number(v ?? 0).toLocaleString()} ${t('unit')}`, t('title')]}
            />
            <Bar
              dataKey="tonnage"
              fill="url(#tar-tonnage-week-grad)"
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
