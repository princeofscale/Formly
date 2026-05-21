'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Timer, Layers, Zap } from 'lucide-react'

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
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
  )

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))),
      1000,
    )
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div
      className="sticky top-2 z-20 rounded-2xl backdrop-blur-md"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 196, 68, 0.06), rgba(255, 110, 118, 0.04))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
        <Stat
          icon={<Timer className="h-3.5 w-3.5" style={{ color: '#A78BFA' }} />}
          label={t('elapsed')}
          value={formatElapsed(elapsed)}
          color="#A78BFA"
        />
        <Stat
          icon={<Layers className="h-3.5 w-3.5" style={{ color: '#5EEAD4' }} />}
          label={t('sets')}
          value={`${totalSets}`}
          color="#5EEAD4"
        />
        <Stat
          icon={<Zap className="h-3.5 w-3.5" style={{ color: '#FFC044' }} />}
          label={t('tonnage')}
          value={`${Math.round(totalTonnageKg).toLocaleString()}`}
          unit="kg"
          color="#FFC044"
        />
      </div>
    </div>
  )
}

interface StatProps {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  color: string
}

function Stat({ icon, label, value, unit, color }: StatProps) {
  return (
    <div className="flex flex-col items-center justify-center py-2.5 px-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/45">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-extrabold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-[9px] text-white/35 font-mono">{unit}</span>}
      </div>
    </div>
  )
}
