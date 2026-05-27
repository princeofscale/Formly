'use client'

import { useLocale } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TonnageByMonth } from '@/lib/services/analytics.service'
import { weightUnit } from '@/lib/units'

export function TonnageChart({ data }: { data: TonnageByMonth[] }) {
  const locale = useLocale()
  const kg = weightUnit(locale)

  if (data.length === 0) {
    return (
      <p
        style={{
          font: '500 12px/1.4 var(--tar-mono)',
          letterSpacing: '0.06em',
          color: 'var(--tar-ink-mute)',
        }}
      >
        No data yet.
      </p>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="tar-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB627" />
              <stop offset="100%" stopColor="rgba(255, 107, 53, 0.35)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 241, 232, 0.08)" />
          <XAxis
            dataKey="month"
            tick={{
              fill: 'rgba(245, 241, 232, 0.42)',
              fontSize: 10,
              fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
            }}
            axisLine={{ stroke: 'rgba(245, 241, 232, 0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{
              fill: 'rgba(245, 241, 232, 0.42)',
              fontSize: 10,
              fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
            }}
            unit={kg}
            width={55}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#11111a',
              border: '1px solid rgba(245, 241, 232, 0.16)',
              borderRadius: 10,
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(255, 182, 39, 0.08)' }}
            formatter={(v) => [`${Number(v ?? 0).toFixed(0)} ${kg}`, 'Volume']}
          />
          <Bar dataKey="total_kg" fill="url(#tar-bar-grad)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
