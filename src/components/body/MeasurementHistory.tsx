import { useTranslations, useLocale } from 'next-intl'
import { DeleteMeasurementButton } from './DeleteMeasurementButton'
import type { BodyMeasurement } from '@/lib/types/models'

interface Props {
  measurements: BodyMeasurement[]
}

export function MeasurementHistory({ measurements }: Props) {
  const t = useTranslations('body')
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const locale = useLocale()

  if (measurements.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-zinc-500">{t('noData')}</div>
    )
  }

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{t('history.title')}</h2>
      <div className="space-y-2">
        {measurements.map(m => {
          const items: Array<{ label: string; value: number | null; unit: string }> = [
            { label: tLabel('weight'),   value: m.weight_kg,    unit: tUnit('kg') },
            { label: tLabel('waist'),    value: m.waist_cm,     unit: tUnit('cm') },
            { label: tLabel('chest'),    value: m.chest_cm,     unit: tUnit('cm') },
            { label: tLabel('hips'),     value: m.hips_cm,      unit: tUnit('cm') },
            { label: tLabel('biceps'),   value: m.biceps_cm,    unit: tUnit('cm') },
            { label: tLabel('bodyFat'),  value: m.body_fat_pct, unit: tUnit('pct') },
          ].filter(x => x.value !== null)

          return (
            <div
              key={m.id}
              className="p-3 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-mono text-amber-400">{formatDate(m.date)}</div>
                <DeleteMeasurementButton id={m.id} />
              </div>
              {items.length === 0 ? (
                <div className="text-[11px] text-zinc-600">—</div>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="text-[11px]">
                      <span className="text-zinc-500">{it.label}:</span>{' '}
                      <span className="font-mono text-zinc-200">
                        {it.value!.toFixed(1)}
                      </span>{' '}
                      <span className="text-zinc-600">{it.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
