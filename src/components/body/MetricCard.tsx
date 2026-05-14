'use client'

import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { MetricSparkline } from './MetricSparkline'
import type { MeasurementField } from '@/lib/types/models'

const METRIC_COLORS: Record<MeasurementField, string> = {
  weight_kg:    '#f59e0b',
  chest_cm:     '#a78bfa',
  waist_cm:     '#f87171',
  hips_cm:      '#f472b6',
  biceps_cm:    '#4ade80',
  body_fat_pct: '#c084fc',
}

const METRIC_LABEL_KEY: Record<MeasurementField, string> = {
  weight_kg:    'weight',
  chest_cm:     'chest',
  waist_cm:     'waist',
  hips_cm:      'hips',
  biceps_cm:    'biceps',
  body_fat_pct: 'bodyFat',
}

const METRIC_UNIT: Record<MeasurementField, 'kg' | 'cm' | 'pct'> = {
  weight_kg:    'kg',
  chest_cm:     'cm',
  waist_cm:     'cm',
  hips_cm:      'cm',
  biceps_cm:    'cm',
  body_fat_pct: 'pct',
}

const DECREASE_IS_GOOD: Record<MeasurementField, boolean> = {
  weight_kg:    false,
  chest_cm:     false,
  waist_cm:     true,
  hips_cm:      false,
  biceps_cm:    false,
  body_fat_pct: true,
}

interface Props {
  field: MeasurementField
  current: number | null
  previous: number | null
  history: number[]
}

export function MetricCard({ field, current, previous, history }: Props) {
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const color = METRIC_COLORS[field]
  const unit = tUnit(METRIC_UNIT[field])
  const label = tLabel(METRIC_LABEL_KEY[field])

  const delta = current !== null && previous !== null ? current - previous : null

  let deltaColor = 'text-zinc-500'
  let DeltaIcon = Minus
  if (delta !== null && Math.abs(delta) >= 0.01) {
    DeltaIcon = delta > 0 ? ArrowUp : ArrowDown
    const decreaseIsGood = DECREASE_IS_GOOD[field]
    const isPositiveOutcome = decreaseIsGood ? delta < 0 : delta > 0
    deltaColor = isPositiveOutcome ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <div className="text-2xl font-black text-white tabular-nums leading-none">
          {current !== null ? current.toFixed(1) : '—'}
        </div>
        <div className="text-[10px] text-zinc-500">{unit}</div>
      </div>
      {delta !== null && Math.abs(delta) >= 0.01 && (
        <div className={`flex items-center gap-1 text-[10px] font-mono ${deltaColor} mb-2`}>
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
        </div>
      )}
      <MetricSparkline values={history} color={color} height={32} width={120} />
    </div>
  )
}
