'use client'

import { useState } from 'react'

interface DataPoint {
  date: string
  value: number
}

interface Props {
  data: DataPoint[]
  exerciseName: string
  unit: string
}

const WIDTH = 600
const HEIGHT = 220
const PADDING = { top: 24, right: 16, bottom: 28, left: 36 }

export function ProgressLineChart({ data, exerciseName, unit }: Props) {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: HEIGHT }}>
        <div className="text-3xl mb-2 opacity-30">📊</div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {exerciseName ? `Нет данных по «${exerciseName}»` : 'Выбери упражнение'}
        </p>
      </div>
    )
  }

  const innerW = WIDTH - PADDING.left - PADDING.right
  const innerH = HEIGHT - PADDING.top - PADDING.bottom

  const values = data.map((d) => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  // Add 10% padding to scale
  const scaleMin = Math.max(0, minV - range * 0.1)
  const scaleMax = maxV + range * 0.1
  const scaleRange = scaleMax - scaleMin || 1

  const points = data.map((d, i) => {
    const x = PADDING.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
    const y = PADDING.top + innerH - ((d.value - scaleMin) / scaleRange) * innerH
    return { x, y, value: d.value, date: d.date }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${PADDING.top + innerH} L ${points[0].x.toFixed(2)} ${PADDING.top + innerH} Z`

  // Y-axis tick labels (3 ticks)
  const yTicks = [scaleMax, scaleMin + scaleRange / 2, scaleMin]

  // X-axis labels: first and last
  const xLabels =
    data.length > 0
      ? [data[0].date, data[Math.floor(data.length / 2)]?.date, data[data.length - 1].date]
      : []

  function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
    })
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    // Find closest point
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - x)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    setHover({ idx: best, x: points[best].x, y: points[best].y })
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full block"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="progress-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF3B47" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF3B47" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {yTicks.map((v, i) => {
          const y = PADDING.top + (i / 2) * innerH
          return (
            <g key={i}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={WIDTH - PADDING.right}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                fontSize="10"
                fill="rgba(255,255,255,0.4)"
                textAnchor="end"
              >
                {v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Area + line */}
        <path d={areaPath} fill="url(#progress-line-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#FF3B47"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255, 59, 71, 0.5))' }}
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover?.idx === i ? 5 : 3}
            fill="#FF3B47"
            stroke="#15151C"
            strokeWidth="2"
            style={
              hover?.idx === i ? { filter: 'drop-shadow(0 0 6px rgba(255,59,71,0.8))' } : undefined
            }
          />
        ))}

        {/* Hover tooltip */}
        {hover && (
          <g>
            <line
              x1={hover.x}
              y1={PADDING.top}
              x2={hover.x}
              y2={HEIGHT - PADDING.bottom}
              stroke="rgba(255,59,71,0.3)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <rect
              x={Math.min(WIDTH - 90, Math.max(PADDING.left, hover.x - 40))}
              y={hover.y - 32}
              width="80"
              height="22"
              rx="6"
              fill="#15151C"
              stroke="rgba(255,59,71,0.4)"
            />
            <text
              x={Math.min(WIDTH - 50, Math.max(PADDING.left + 40, hover.x))}
              y={hover.y - 17}
              fontSize="10"
              fill="#FFFFFF"
              textAnchor="middle"
              fontWeight="600"
            >
              {points[hover.idx].value.toFixed(1)} {unit}
            </text>
          </g>
        )}

        {/* X labels */}
        {xLabels.filter(Boolean).map((d, i) => {
          const x =
            PADDING.left + (xLabels.length === 1 ? innerW / 2 : (i / (xLabels.length - 1)) * innerW)
          return (
            <text
              key={d + i}
              x={x}
              y={HEIGHT - 8}
              fontSize="10"
              fill="rgba(255,255,255,0.4)"
              textAnchor="middle"
            >
              {formatDate(d)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
