'use client'

import { useTranslations } from 'next-intl'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'

interface Props {
  weightKg: number | null
  heightCm: number | null
}

const ZONES = [
  { max: 18.5, color: '#60a5fa', key: 'underweight' },
  { max: 25,   color: '#4ade80', key: 'normal' },
  { max: 30,   color: '#fbbf24', key: 'overweight' },
  { max: 50,   color: '#f87171', key: 'obese' },
]

export function BmiCard({ weightKg, heightCm }: Props) {
  const t = useTranslations('body.bmi')

  if (!weightKg || !heightCm) {
    return (
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">{t('title')}</div>
        <p className="text-sm text-zinc-400">{t('setHeightHint')}</p>
      </div>
    )
  }

  const bmi = calculateBMI(weightKg, heightCm)
  const category = bmiCategory(bmi)
  const categoryKey = category.toLowerCase() as 'underweight' | 'normal' | 'overweight' | 'obese'
  const activeZone = ZONES.find(z => bmi < z.max) ?? ZONES[ZONES.length - 1]

  const scaleMin = 12
  const scaleMax = 40
  const markerPct = Math.max(0, Math.min(100, ((bmi - scaleMin) / (scaleMax - scaleMin)) * 100))

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('title')}</div>
        <div className="text-2xl font-black tabular-nums" style={{ color: activeZone.color }}>
          {bmi.toFixed(1)}
        </div>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden flex">
        <div className="flex-1" style={{ background: '#60a5fa' }} />
        <div className="flex-1" style={{ background: '#4ade80' }} />
        <div className="flex-1" style={{ background: '#fbbf24' }} />
        <div className="flex-1" style={{ background: '#f87171' }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full shadow-lg"
          style={{ left: `${markerPct}%`, marginLeft: '-2px' }}
        />
      </div>

      <div className="text-xs mt-2 font-semibold" style={{ color: activeZone.color }}>
        {t(categoryKey)}
      </div>
    </div>
  )
}
