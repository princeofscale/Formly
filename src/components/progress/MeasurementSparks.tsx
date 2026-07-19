'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { BodyMeasurement, MeasurementMetric } from '@/lib/db/body-measurements'
import { lengthUnit, weightUnit } from '@/lib/units'

interface Props {
  entries: BodyMeasurement[] // newest first
}

const SPARK_METRICS: MeasurementMetric[] = ['weight_kg', 'waist_cm', 'biceps_cm']
// Metrics where a decrease is the win (waist/weight down = green)
const DOWN_IS_GOOD: MeasurementMetric[] = ['weight_kg', 'body_fat_pct', 'waist_cm', 'hips_cm']
const MAX_POINTS = 8

export function MeasurementSparks({ entries }: Props) {
  const t = useTranslations('progress.measurements')
  const locale = useLocale()
  const loc = locale === 'ru' ? 'ru-RU' : 'en-US'

  const hasAny = SPARK_METRICS.some((m) => entries.some((e) => e[m] != null))
  if (!hasAny) return null

  return (
    <div className="tar-ms-sparks tar-d-rise tar-d-rise-2">
      {SPARK_METRICS.map((metric) => {
        const series = entries
          .filter((e) => e[metric] != null)
          .map((e) => e[metric] as number)
          .reverse()
          .slice(-MAX_POINTS)
        const latest = series.length > 0 ? series[series.length - 1] : null
        const prev = series.length > 1 ? series[series.length - 2] : null
        const unit = metric === 'weight_kg' ? weightUnit(locale) : lengthUnit(locale)

        let points = ''
        let last: { x: number; y: number } | null = null
        if (series.length > 1) {
          const min = Math.min(...series)
          const max = Math.max(...series)
          const span = max - min
          const pts = series.map((v, i) => {
            const x = 2 + (54 * i) / (series.length - 1)
            const y = span === 0 ? 13 : 22 - ((v - min) / span) * 18
            return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
          })
          points = pts.map((p) => `${p.x},${p.y}`).join(' ')
          last = pts[pts.length - 1]
        }

        const delta = latest != null && prev != null ? latest - prev : null
        const goodDown = DOWN_IS_GOOD.includes(metric)
        const deltaClass =
          delta == null || Math.abs(delta) < 0.05 ? 'flat' : delta < 0 === goodDown ? 'good' : 'bad'

        return (
          <div key={metric} className="tar-ms-spark">
            <div className="k">{t(`fields.${metric}`)}</div>
            <div className="v tabular-nums">
              {latest != null
                ? latest.toLocaleString(loc, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })
                : '—'}
              {latest != null && <em>{unit}</em>}
            </div>
            {points && (
              <svg viewBox="0 0 60 26" preserveAspectRatio="none" aria-hidden="true">
                <polyline
                  points={points}
                  fill="none"
                  stroke="#ff8a3d"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {last && <circle cx={last.x} cy={last.y} r="2.5" fill="#ffb627" />}
              </svg>
            )}
            {delta != null && Math.abs(delta) >= 0.05 && (
              <span className={`tar-ms-delta ${deltaClass} tabular-nums`}>
                {delta < 0 ? (
                  <ArrowDown className="i" strokeWidth={2.5} />
                ) : (
                  <ArrowUp className="i" strokeWidth={2.5} />
                )}
                {Math.abs(delta).toLocaleString(loc, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
