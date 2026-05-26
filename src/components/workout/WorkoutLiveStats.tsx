'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { weightUnit } from '@/lib/units'

interface Props {
  startedAt: string
  totalSets: number
  totalTonnageKg: number
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function WorkoutLiveStats({ startedAt, totalSets, totalTonnageKg }: Props) {
  const t = useTranslations('workout.liveStats')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
  )

  useEffect(() => {
    const id = setInterval(
      () =>
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))),
      1000,
    )
    return () => clearInterval(id)
  }, [startedAt])

  const tonnage = Math.round(totalTonnageKg).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')

  return (
    <div
      className="sticky top-2 z-20 rounded-2xl backdrop-blur-md grid grid-cols-3"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.06), rgba(255, 182, 39, 0.04))',
        border: '1px solid var(--tar-w-line)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      <Stat label={t('tonnage')} value={tonnage} unit={kg} />
      <Stat label={t('sets')} value={String(totalSets)} divider />
      <Stat label={t('elapsed')} value={formatElapsed(elapsed)} divider />
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  unit?: string
  divider?: boolean
}

function Stat({ label, value, unit, divider }: StatProps) {
  return (
    <div
      className="px-4 py-3"
      style={divider ? { borderLeft: '1px solid var(--tar-w-line)' } : undefined}
    >
      <div className="tar-w-stat-label">{label}</div>
      <div className="tar-w-stat-value" style={{ marginTop: 6 }}>
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  )
}
