'use client'

import { useTranslations } from 'next-intl'
import type { BodyMeasurement } from '@/lib/types/models'

interface Props {
  latest: BodyMeasurement | null
}

export function CurrentSnapshot({ latest }: Props) {
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')

  if (!latest) {
    return null
  }

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
    })

  const stats: Array<{ value: number | null; label: string; unit: string }> = [
    { value: latest.weight_kg,    label: tLabel('weight'),   unit: tUnit('kg') },
    { value: latest.waist_cm,     label: tLabel('waist'),    unit: tUnit('cm') },
    { value: latest.body_fat_pct, label: tLabel('bodyFat'),  unit: tUnit('pct') },
  ]

  const filled = stats.filter(s => s.value !== null)
  if (filled.length === 0) return null

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(139,92,246,0.10))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-mono">
        {formatDate(latest.date)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">{s.label}</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-black text-amber-500 tabular-nums leading-none">
                {s.value !== null ? s.value.toFixed(1) : '—'}
              </div>
              {s.value !== null && (
                <div className="text-[10px] text-zinc-500">{s.unit}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
