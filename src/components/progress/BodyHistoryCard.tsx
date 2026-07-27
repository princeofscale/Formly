'use client'

import { useMemo, useState, type ReactNode } from 'react'
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
 * Weight and height over time. The two share one plot area but never one
 * scale — a centimetre and a kilogram on the same axis would draw a body
 * change that did not happen — so the card switches between them instead.
 */
export function BodyHistoryCard({ points, currentWeight, currentHeight, labels }: Props) {
  const [metric, setMetric] = useState<'weight' | 'height'>('weight')

  const weightSeries = useMemo(
    () =>
      points
        .filter((p): p is BodyHistoryPoint & { weight_kg: number } => p.weight_kg != null)
        .map((p) => ({ date: p.date, value: p.weight_kg })),
    [points],
  )

  const heightSeries = useMemo(
    () =>
      points
        .filter((p): p is BodyHistoryPoint & { height_cm: number } => p.height_cm != null)
        .map((p) => ({ date: p.date, value: p.height_cm })),
    [points],
  )

  const first = weightSeries[0]?.value ?? null
  const last = weightSeries[weightSeries.length - 1]?.value ?? currentWeight
  const delta = first != null && last != null && weightSeries.length > 1 ? last - first : null

  const series = metric === 'weight' ? weightSeries : heightSeries
  const unit = metric === 'weight' ? labels.weightUnit : labels.heightUnit
  const seriesColor = metric === 'weight' ? '#FFB627' : '#22D3A8'

  return (
    <div className="tar-pg-card">
      <div className="tar-d-eyebrow" style={{ marginBottom: 12 }}>
        {labels.title}
      </div>

      {/* The two stats double as the chart's tabs — tapping one plots it. */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <MetricStat
          active={metric === 'weight'}
          onSelect={() => setMetric('weight')}
          accent="#FFB627"
          icon={<Scale className="h-3.5 w-3.5" style={{ color: 'var(--tar-brand-2, #FFB627)' }} />}
          label={labels.weight}
          value={last != null ? (Number.isInteger(last) ? last : last.toFixed(1)) : '—'}
          unit={labels.weightUnit}
          trailing={
            delta != null && Math.abs(delta) >= 0.1 ? (
              <span
                className="ml-auto text-[11px] font-bold tabular-nums"
                style={{ color: delta < 0 ? '#22D3A8' : '#FFB627' }}
              >
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            ) : null
          }
        />

        <MetricStat
          active={metric === 'height'}
          onSelect={() => setMetric('height')}
          accent="#22D3A8"
          icon={<Ruler className="h-3.5 w-3.5" style={{ color: '#22D3A8' }} />}
          label={labels.height}
          value={heightSeries[heightSeries.length - 1]?.value ?? currentHeight ?? '—'}
          unit={labels.heightUnit}
        />
      </div>

      {series.length >= 2 ? (
        <ProgressLineChart
          data={series}
          exerciseName={metric === 'weight' ? labels.weight : labels.height}
          unit={unit}
          color={seriesColor}
        />
      ) : (
        <p className="px-1 py-2 text-xs text-white/40">{labels.empty}</p>
      )}
    </div>
  )
}

function MetricStat({
  active,
  onSelect,
  accent,
  icon,
  label,
  value,
  unit,
  trailing,
}: {
  active: boolean
  onSelect: () => void
  accent: string
  icon: ReactNode
  label: string
  value: string | number
  unit: string
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="rounded-2xl p-3 text-left transition-colors"
      style={{
        background: active
          ? `color-mix(in srgb, ${accent} 10%, transparent)`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `color-mix(in srgb, ${accent} 45%, transparent)` : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-white/45">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tabular-nums text-white">{value}</span>
        <span className="text-xs text-white/45">{unit}</span>
        {trailing}
      </div>
    </button>
  )
}
