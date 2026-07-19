'use client'

import { useTranslations, useLocale } from 'next-intl'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { deleteMeasurementAction } from '@/app/(app)/progress/measurements/actions'
import {
  MEASUREMENT_METRICS,
  type BodyMeasurement,
  type MeasurementMetric,
} from '@/lib/db/body-measurements'
import { lengthUnit, weightUnit } from '@/lib/units'

interface Props {
  entries: BodyMeasurement[]
}

// Metrics where a decrease is the win (waist/weight down = green)
const DOWN_IS_GOOD: MeasurementMetric[] = ['weight_kg', 'body_fat_pct', 'waist_cm', 'hips_cm']

export function MeasurementHistory({ entries }: Props) {
  const t = useTranslations('progress.measurements')
  const locale = useLocale()
  const loc = locale === 'ru' ? 'ru-RU' : 'en-US'

  const fmt = (v: number) =>
    v.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const unitOf = (f: MeasurementMetric) =>
    f === 'weight_kg' ? weightUnit(locale) : f === 'body_fat_pct' ? '%' : lengthUnit(locale)

  if (entries.length === 0) {
    return (
      <div className="tar-ms-empty">
        <div className="t">{t('emptyTitle')}</div>
        <div className="s">{t('emptySub')}</div>
      </div>
    )
  }

  return (
    <div className="tar-ms-list tar-d-rise tar-d-rise-4">
      {entries.map((entry, i) => {
        const prev = entries[i + 1]
        const dateLabel = new Date(entry.date + 'T00:00:00').toLocaleDateString(loc, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })

        const filled = MEASUREMENT_METRICS.filter((m) => entry[m] != null)
        if (filled.length === 0 && !entry.notes) return null

        return (
          <div key={entry.id} className="tar-ms-entry">
            <div className="dt">
              <b>{dateLabel}</b>
              <form action={deleteMeasurementAction}>
                <input type="hidden" name="date" value={entry.date} />
                <button type="submit" aria-label={t('delete')}>
                  <Trash2 className="i" />
                </button>
              </form>
            </div>

            <div className="tar-ms-vals">
              {filled.map((metric) => {
                const value = entry[metric] as number
                const prevValue = prev?.[metric] as number | null | undefined
                const delta = prevValue != null ? value - prevValue : null
                const goodDown = DOWN_IS_GOOD.includes(metric)
                return (
                  <div key={metric} className="tar-ms-val">
                    <div className="k">{t(`fields.${metric}`)}</div>
                    <div className="n tabular-nums">
                      {fmt(value)}
                      <em>{unitOf(metric)}</em>
                    </div>
                    {delta == null ? (
                      <span className="tar-ms-delta flat">{t('deltaFirst')}</span>
                    ) : Math.abs(delta) < 0.05 ? (
                      <span className="tar-ms-delta flat">{t('deltaFlat')}</span>
                    ) : (
                      <span
                        className={`tar-ms-delta ${delta < 0 === goodDown ? 'good' : 'bad'} tabular-nums`}
                      >
                        {delta < 0 ? (
                          <ArrowDown className="i" strokeWidth={2.5} />
                        ) : (
                          <ArrowUp className="i" strokeWidth={2.5} />
                        )}
                        {fmt(Math.abs(delta))}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {entry.notes && (
              <p
                className="mt-3"
                style={{ font: '500 12px/1.5 var(--tar-text)', color: 'var(--tar-ink-mute)' }}
              >
                {entry.notes}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
