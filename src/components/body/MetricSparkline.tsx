'use client'

interface Props {
  values: number[]
  color?: string
  height?: number
  width?: number
}

export function MetricSparkline({
  values,
  color = '#f59e0b',
  height = 40,
  width = 120,
}: Props) {
  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-700"
        style={{ height, width }}
      >
        —
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pad = 2
  const innerHeight = height - pad * 2

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = pad + innerHeight - ((v - min) / range) * innerHeight
    return { x, y }
  })

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`))
    .join(' ')

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  const gradientId = `spark-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}
