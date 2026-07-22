'use client'

import { useMemo } from 'react'
import { Ruler, Scale } from 'lucide-react'
import { ProgressLineChart } from './ProgressLineChart'

export interface BodyHistoryPoint {
  date: string
  weight_kg: number | null
  height_cm: number | null
}

interface Props {
  points: BodyHistoryPoint[]
  currentWeight: number | null
  currentHeight: number | null
  labels: {
    title: string
    weight: string
    height: string
    weightUnit: string
    heightUnit: string
    empty: string
  }
}

/**
 * Weight-over-time chart with the current height as a companion stat.
 * Height changes too rarely (and lives on a different scale) to share the
 * plot — a dual-axis chart would mislead, so it stays a stat chip.
 */
export function BodyHistoryCard({ points, currentWeight, currentHeight, labels }: Props) {
  const weightSeries = useMemo(
    () =>
      points
        .filter((p): p is BodyHistoryPoint & { weight_kg: number } => p.weight_kg != null)
        .map((p) => ({ date: p.date, value: p.weight_kg })),
    [points],
  )

  const first = weightSeries[0]?.value ?? null
  const last = weightSeries[weightSeries.length - 1]?.value ?? currentWeight
  const delta = first != null && last != null && weightSeries.length > 1 ? last - first : null

  return (
    <div className="tar-pg-card">
      <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
        {labels.title}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-2xl p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" style={{ color: 'var(--tar-brand-2, #FFB627)' }} />
            <span className="text-[10px] uppercase tracking-widest text-white/45">
              {labels.weight}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tabular-nums text-white">
              {last != null ? (Number.isInteger(last) ? last : last.toFixed(1)) : '—'}
            </span>
            <span className="text-xs text-white/45">{labels.weightUnit}</span>
            {delta != null && Math.abs(delta) >= 0.1 && (
              <span
                className="ml-auto text-[11px] font-bold tabular-nums"
                style={{ color: delta < 0 ? '#22D3A8' : '#FFB627' }}
              >
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5" style={{ color: '#22D3A8' }} />
            <span className="text-[10px] uppercase tracking-widest text-white/45">
              {labels.height}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tabular-nums text-white">
              {currentHeight ?? '—'}
            </span>
            <span className="text-xs text-white/45">{labels.heightUnit}</span>
          </div>
        </div>
      </div>

      {weightSeries.length >= 2 ? (
        <ProgressLineChart
          data={weightSeries}
          exerciseName={labels.weight}
          unit={labels.weightUnit}
        />
      ) : (
        <p className="px-1 py-2 text-xs text-white/40">{labels.empty}</p>
      )}
    </div>
  )
}
