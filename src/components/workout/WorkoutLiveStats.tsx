'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { weightUnit } from '@/lib/units'

interface Props {
  totalSets: number
  totalTonnageKg: number
  exerciseCount: number
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function WorkoutLiveStats({ totalSets, totalTonnageKg, exerciseCount }: Props) {
  const t = useTranslations('workout.liveStats')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const tonnage = Math.round(totalTonnageKg).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')

  return (
    <div className="tar-w-stats">
      <div className="tar-w-stat">
        <div className="tar-w-stat-label">{t('tonnage')}</div>
        <div className="tar-w-stat-value accent" style={{ marginTop: 6 }}>
          {tonnage}
          <span className="unit">{kg}</span>
        </div>
      </div>
      <div className="tar-w-stat">
        <div className="tar-w-stat-label">{t('sets')}</div>
        <div className="tar-w-stat-value" style={{ marginTop: 6 }}>
          {totalSets}
        </div>
      </div>
      <div className="tar-w-stat">
        <div className="tar-w-stat-label">{t('exercises')}</div>
        <div className="tar-w-stat-value" style={{ marginTop: 6 }}>
          {exerciseCount}
        </div>
      </div>
    </div>
  )
}

export function WorkoutElapsed({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const compute = () =>
      Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe wall-clock init
    setElapsed(compute())
    const id = setInterval(() => setElapsed(compute()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <>{formatElapsed(elapsed)}</>
}
