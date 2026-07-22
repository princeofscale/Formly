import Link from 'next/link'
import type { ReactNode } from 'react'

interface Point {
  date: string
  best: number
}

export interface MajorLift {
  exerciseId: string
  slug: string
  name: string
  history: Point[]
  glyph: ReactNode
  muscle: 'chest' | 'back' | 'legs' | 'shoulder'
  color: string
}

interface Props {
  lifts: MajorLift[]
}

function buildPath(history: Point[], w: number, h: number, pad = 2): string | null {
  if (history.length < 2) return null
  const values = history.map((p) => p.best)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = (w - pad * 2) / (history.length - 1)
  return history
    .map((p, i) => {
      const x = pad + i * step
      const y = pad + (h - pad * 2) * (1 - (p.best - min) / range)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildArea(line: string, h: number): string {
  // Close path to bottom for fill
  const lastX =
    line
      .split(' ')
      .pop()
      ?.match(/L([\d.]+)/)?.[1] ?? '160'
  return `${line} L${lastX},${h} L0,${h} Z`
}

export function MajorLiftsGrid({ lifts }: Props) {
  const W = 160
  const H = 36
  return (
    <div className="tar-pg-grid">
      {lifts.map((lift) => {
        const linePath = buildPath(lift.history, W, H)
        const areaPath = linePath ? buildArea(linePath, H) : null
        const latest = lift.history[lift.history.length - 1]?.best ?? null
        // 30-day delta: find point closest to 30 days ago
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        const cutoffIso = cutoff.toISOString().slice(0, 10)
        const baseline = [...lift.history].reverse().find((p) => p.date <= cutoffIso)?.best ?? null
        const delta = latest != null && baseline != null ? latest - baseline : null
        const deltaDir: 'up' | 'down' | 'flat' =
          delta == null ? 'flat' : delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat'
        const hasNewPR =
          latest != null && lift.history.length > 1
            ? latest === Math.max(...lift.history.map((p) => p.best))
            : false
        const gradId = `tar-spark-${lift.slug}`

        return (
          <Link
            key={lift.exerciseId}
            href={`/progress?exercise=${lift.exerciseId}`}
            className={`tar-pg-card ${hasNewPR ? 'pr' : ''}`}
          >
            {hasNewPR && <span className="prtag">PR</span>}
            <div className="top">
              <span className={`tar-s-mglyph ${lift.muscle}`}>{lift.glyph}</span>
              <span className="n">{lift.name}</span>
            </div>
            <div className="v">
              <span className="num">{latest != null ? Math.round(latest) : '—'}</span>
              <span className="u">kg</span>
            </div>
            {delta != null && deltaDir !== 'flat' ? (
              <span className={`d ${deltaDir}`}>
                {deltaDir === 'up' ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} kg · 30d
              </span>
            ) : (
              <span className="d flat">— hold · 30d</span>
            )}
            {linePath && (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
                preserveAspectRatio="none"
                style={{ marginLeft: -4, marginRight: -4, marginBottom: -4, marginTop: 4 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lift.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={lift.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {areaPath && <path fill={`url(#${gradId})`} d={areaPath} />}
                <path
                  fill="none"
                  stroke={lift.color}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={linePath}
                />
              </svg>
            )}
          </Link>
        )
      })}
    </div>
  )
}
