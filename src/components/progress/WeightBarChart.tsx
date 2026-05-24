'use client'

interface DataPoint {
  date: string
  weight_kg: number
}

interface Props {
  data: DataPoint[]
}

export function WeightBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Нет замеров веса
      </div>
    )
  }

  const values = data.map((d) => d.weight_kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const scaleMin = min - range * 0.15
  const scaleRange = max - scaleMin || 1

  function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
  }

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const heightPct = ((d.weight_kg - scaleMin) / scaleRange) * 100
        const isLatest = i === data.length - 1
        return (
          <div key={d.date + i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div
              className="text-[10px] font-mono tabular-nums"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              {d.weight_kg.toFixed(1)}
            </div>
            <div
              className="w-full rounded-t-[8px] transition-all"
              style={{
                height: `${Math.max(8, heightPct)}%`,
                background: isLatest
                  ? 'linear-gradient(180deg, #FF3B47, rgba(255,59,71,0.7))'
                  : 'linear-gradient(180deg, rgba(255,59,71,0.4), rgba(255,59,71,0.15))',
                boxShadow: isLatest ? '0 0 16px rgba(255,59,71,0.4)' : undefined,
              }}
            />
            <div
              className="text-[10px] uppercase tracking-wide"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {formatDate(d.date)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
