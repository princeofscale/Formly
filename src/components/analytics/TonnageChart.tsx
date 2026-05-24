'use client'

import { useLocale } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TonnageByMonth } from '@/lib/services/analytics.service'
import { weightUnit } from '@/lib/units'

export function TonnageChart({ data }: { data: TonnageByMonth[] }) {
  const locale = useLocale()
  const kg = weightUnit(locale)

  if (data.length === 0) {
    return <p className="text-zinc-500 text-sm">No data yet.</p>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} unit={kg} width={55} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
            }}
            formatter={(v) => [`${Number(v ?? 0).toFixed(0)} ${kg}`, 'Volume']}
          />
          <Bar dataKey="total_kg" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
