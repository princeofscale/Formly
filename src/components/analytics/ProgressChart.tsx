'use client'

import { useLocale } from 'next-intl'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { weightUnit } from '@/lib/units'

interface DataPoint {
  date: string
  e1rm: number
}

export function ProgressChart({ data, exerciseName }: { data: DataPoint[]; exerciseName: string }) {
  const locale = useLocale()
  const kg = weightUnit(locale)

  if (data.length < 2) {
    return (
      <p
        style={{
          font: '500 12px/1.4 var(--tar-mono)',
          letterSpacing: '0.06em',
          color: 'var(--tar-ink-mute)',
        }}
      >
        Log at least 2 sessions to see trend.
      </p>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="tar-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#FFB627" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 241, 232, 0.08)" />
          <XAxis
            dataKey="date"
            tick={{
              fill: 'rgba(245, 241, 232, 0.42)',
              fontSize: 10,
              fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
            }}
            tickFormatter={(d) => d.slice(5)}
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
            width={45}
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
            labelStyle={{ color: 'rgba(245, 241, 232, 0.62)' }}
            itemStyle={{ color: '#FFB627' }}
            cursor={{ stroke: 'rgba(255, 182, 39, 0.25)', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="url(#tar-line-grad)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#FFB627', stroke: '#FF6B35', strokeWidth: 2 }}
            name={exerciseName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
