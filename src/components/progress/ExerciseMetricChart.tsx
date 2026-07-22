'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ProgressLineChart } from './ProgressLineChart'

interface Props {
  weightHistory: { date: string; best: number }[]
  volumeHistory: { date: string; volume_kg: number; sets: number }[]
  exerciseName: string
}

type Metric = 'weight' | 'volume'

export function ExerciseMetricChart({ weightHistory, volumeHistory, exerciseName }: Props) {
  const t = useTranslations('progress')
  const [metric, setMetric] = useState<Metric>('weight')

  const data = useMemo(() => {
    if (metric === 'weight') {
      return weightHistory.map((p) => ({ date: p.date, value: Math.round(p.best * 10) / 10 }))
    }
    return volumeHistory.map((p) => ({ date: p.date, value: p.volume_kg }))
  }, [metric, weightHistory, volumeHistory])

  const unit = metric === 'weight' ? t('unitWeight') : t('unitVolume')

  // Summary numbers
  const summary = useMemo(() => {
    if (metric === 'weight' && weightHistory.length > 0) {
      const last = weightHistory[weightHistory.length - 1].best
      const first = weightHistory[0].best
      const delta = last - first
      return { current: Math.round(last), deltaSigned: delta }
    }
    if (metric === 'volume' && volumeHistory.length > 0) {
      const total = volumeHistory.reduce((s, p) => s + p.volume_kg, 0)
      const totalSets = volumeHistory.reduce((s, p) => s + p.sets, 0)
      return { current: Math.round(total), totalSets }
    }
    return null
  }, [metric, weightHistory, volumeHistory])

  return (
    <div className="space-y-3">
      {/* Metric tabs */}
      <div
        className="flex items-center p-0.5 rounded-[10px] gap-0.5"
        style={{ background: 'rgba(255, 255, 255, 0.04)' }}
      >
        <MetricTab
          active={metric === 'weight'}
          onClick={() => setMetric('weight')}
          label={t('metricWeight')}
        />
        <MetricTab
          active={metric === 'volume'}
          onClick={() => setMetric('volume')}
          label={t('metricVolume')}
        />
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-white tabular-nums">
            {summary.current.toLocaleString()}
          </span>
          <span
            className="text-[11px] uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {unit}
          </span>
          {(() => {
            const rawDelta = 'deltaSigned' in summary ? summary.deltaSigned : undefined
            const delta: number = rawDelta ?? 0
            if (metric !== 'weight' || delta === 0) return null
            return (
              <span
                className="text-[11px] font-bold tabular-nums ml-auto"
                style={{ color: delta > 0 ? '#22D3A8' : '#FF6E76' }}
              >
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)} {t('unitWeight')}
              </span>
            )
          })()}
          {metric === 'volume' && 'totalSets' in summary && (
            <span
              className="text-[11px] tabular-nums ml-auto"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {summary.totalSets} {t('setsCount')}
            </span>
          )}
        </div>
      )}

      <ProgressLineChart data={data} exerciseName={exerciseName} unit={unit} />
    </div>
  )
}

function MetricTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-8 text-[11px] font-bold uppercase tracking-widest rounded-[8px] transition-colors"
      style={{
        background: active ? 'var(--tar-brand-2, #FFB627)' : 'transparent',
        color: active ? '#151515' : 'rgba(255, 255, 255, 0.55)',
      }}
    >
      {label}
    </button>
  )
}
