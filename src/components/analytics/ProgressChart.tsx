interface DataPoint {
  date: string
  e1rm: number
}

export function ProgressChart({
  data,
  exerciseName,
  unit,
  emptyLabel,
}: {
  data: DataPoint[]
  exerciseName: string
  unit: string
  emptyLabel: string
}) {
  if (data.length < 2) {
    return <p className="font-mono text-xs tracking-wide text-white/40">{emptyLabel}</p>
  }

  const values = data.map((point) => point.e1rm)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = data.map((point, index) => ({
    ...point,
    x: 18 + (index / (data.length - 1)) * 564,
    y: 142 - ((point.e1rm - min) / range) * 116,
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="h-48">
      <svg
        viewBox="0 0 600 180"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`${exerciseName}: ${Math.round(min)}–${Math.round(max)} ${unit}`}
      >
        <defs>
          <linearGradient id="analytics-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF6B35" />
            <stop offset="1" stopColor="#FFB627" />
          </linearGradient>
          <linearGradient id="analytics-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFB627" stopOpacity=".22" />
            <stop offset="1" stopColor="#FF6B35" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[26, 64, 103, 142].map((y) => (
          <line key={y} x1="18" x2="582" y1={y} y2={y} stroke="rgba(245,241,232,.08)" />
        ))}
        <polygon points={`18,142 ${line} 582,142`} fill="url(#analytics-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="url(#analytics-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#11111A" stroke="#FFB627" strokeWidth="2">
              <title>{`${point.date}: ${point.e1rm.toFixed(1)} ${unit}`}</title>
            </circle>
            {(index === 0 || index === points.length - 1) && (
              <text
                x={point.x}
                y="169"
                textAnchor={index === 0 ? 'start' : 'end'}
                fill="rgba(245,241,232,.42)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {point.date.slice(5)}
              </text>
            )}
          </g>
        ))}
        <text
          x="18"
          y="19"
          fill="rgba(245,241,232,.48)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(max)} {unit}
        </text>
      </svg>
    </div>
  )
}
