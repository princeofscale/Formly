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
    return <p className="text-zinc-500 text-sm">Log at least 2 sessions to see trend.</p>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickFormatter={(d) => d.slice(5)}
          />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit={kg} width={45} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#22c55e' }}
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name={exerciseName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
