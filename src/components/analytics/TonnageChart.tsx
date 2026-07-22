import type { TonnageByMonth } from '@/lib/services/analytics.service'

export function TonnageChart({
  data,
  unit,
  locale,
  emptyLabel,
}: {
  data: TonnageByMonth[]
  unit: string
  locale: string
  emptyLabel: string
}) {
  if (data.length === 0) {
    return <p className="font-mono text-xs tracking-wide text-white/40">{emptyLabel}</p>
  }

  const max = Math.max(...data.map((point) => point.total_kg), 1)
  const slot = 564 / data.length
  const width = Math.max(8, slot - 8)

  return (
    <div className="h-48">
      <svg
        viewBox="0 0 600 180"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`${Math.round(data.reduce((sum, point) => sum + point.total_kg, 0))} ${unit}`}
      >
        <defs>
          <linearGradient id="analytics-bars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFB627" />
            <stop offset="1" stopColor="#FF6B35" stopOpacity=".38" />
          </linearGradient>
        </defs>
        {[26, 64, 103, 142].map((y) => (
          <line key={y} x1="18" x2="582" y1={y} y2={y} stroke="rgba(245,241,232,.08)" />
        ))}
        {data.map((point, index) => {
          const height = Math.max(2, (point.total_kg / max) * 116)
          const x = 18 + index * slot + (slot - width) / 2
          return (
            <g key={point.month}>
              <rect
                x={x}
                y={142 - height}
                width={width}
                height={height}
                rx="6"
                fill="url(#analytics-bars)"
              >
                <title>{`${point.month}: ${Math.round(point.total_kg)} ${unit}`}</title>
              </rect>
              <text
                x={x + width / 2}
                y="169"
                textAnchor="middle"
                fill="rgba(245,241,232,.42)"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {point.month.slice(5)}
              </text>
            </g>
          )
        })}
        <text
          x="18"
          y="19"
          fill="rgba(245,241,232,.48)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(max).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} {unit}
        </text>
      </svg>
    </div>
  )
}
