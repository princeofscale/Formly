'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { deleteMeasurementAction } from '@/app/(app)/progress/measurements/actions'
import { MEASUREMENT_METRICS, type BodyMeasurement, type MeasurementMetric } from '@/lib/db/body-measurements'

interface Props {
  entries: BodyMeasurement[]
}

const METRIC_UNIT: Record<MeasurementMetric, string> = {
  weight_kg: 'kg',
  body_fat_pct: '%',
  waist_cm: 'cm',
  chest_cm: 'cm',
  hips_cm: 'cm',
  biceps_cm: 'cm',
  thigh_cm: 'cm',
  calf_cm: 'cm',
  neck_cm: 'cm',
}

function formatDelta(delta: number, unit: string): { text: string; color: string } {
  const abs = Math.abs(delta)
  if (abs < 0.05) return { text: '·', color: 'rgba(255,255,255,0.25)' }
  const sign = delta > 0 ? '+' : '−'
  // For weight & circumferences, decreasing is usually goal — but we don't assume.
  // Just show direction in neutral colors; let user interpret.
  const color = delta > 0 ? '#5EEAD4' : '#FFC044'
  return { text: `${sign}${abs.toFixed(1)} ${unit}`, color }
}

export function MeasurementHistory({ entries }: Props) {
  const t = useTranslations('progress.measurements')
  const locale = useLocale()

  if (entries.length === 0) {
    return (
      <div
        className="rounded-[20px] p-5 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-sm text-white/45">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const prev = entries[i + 1]
        const date = new Date(entry.date + 'T00:00:00')
        const dateLabel = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })

        const filled = MEASUREMENT_METRICS.filter(m => entry[m] != null)
        if (filled.length === 0 && !entry.notes) return null

        return (
          <div
            key={entry.id}
            className="rounded-[16px] p-4"
            style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs font-bold text-white">{dateLabel}</p>
              <form action={deleteMeasurementAction}>
                <input type="hidden" name="date" value={entry.date} />
                <button
                  type="submit"
                  aria-label={t('delete')}
                  className="text-white/30 hover:text-red-300 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filled.map(metric => {
                const value = entry[metric] as number
                const prevValue = prev?.[metric] as number | null | undefined
                const delta = prevValue != null ? formatDelta(value - prevValue, METRIC_UNIT[metric]) : null
                return (
                  <div key={metric} className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-white/35">
                      {t(`fields.${metric}`)}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-white">
                      {value.toFixed(1)} <span className="text-white/35">{METRIC_UNIT[metric]}</span>
                    </span>
                    {delta && (
                      <span className="text-[10px] tabular-nums" style={{ color: delta.color }}>
                        {delta.text}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {entry.notes && (
              <p className="mt-3 text-xs text-white/55 leading-relaxed">{entry.notes}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
