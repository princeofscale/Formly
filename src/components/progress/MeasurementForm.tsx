'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { saveMeasurementAction } from '@/app/(app)/progress/measurements/actions'
import type { BodyMeasurement, MeasurementMetric } from '@/lib/db/body-measurements'
import { lengthUnit, weightUnit } from '@/lib/units'

interface Props {
  initial: BodyMeasurement | null
  defaultDate: string
  hasHistory: boolean
}

const MAIN_FIELDS: MeasurementMetric[] = ['weight_kg', 'waist_cm', 'chest_cm', 'biceps_cm']
const EXTRA_FIELDS: MeasurementMetric[] = [
  'hips_cm',
  'thigh_cm',
  'calf_cm',
  'neck_cm',
  'body_fat_pct',
]

export function MeasurementForm({ initial, defaultDate, hasHistory }: Props) {
  const t = useTranslations('progress.measurements')
  const locale = useLocale()
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [open, setOpen] = useState(
    EXTRA_FIELDS.some((f) => initial?.[f] != null) || Boolean(initial?.notes),
  )

  const unitOf = (f: MeasurementMetric) =>
    f === 'weight_kg' ? weightUnit(locale) : f === 'body_fat_pct' ? '%' : lengthUnit(locale)

  const numberField = (f: MeasurementMetric) => (
    <label key={f} className="tar-ms-field">
      <span className="lbl">
        {t(`fields.${f}`)}
        <span>{unitOf(f)}</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        name={f}
        step="0.1"
        defaultValue={initial?.[f] != null ? String(initial[f]) : ''}
        placeholder="—"
        className="tabular-nums"
      />
    </label>
  )

  return (
    <form action={saveMeasurementAction} className={`tar-ms-form${open ? ' open' : ''}`}>
      <div className="tar-d-eyebrow accent">{hasHistory ? t('newEntry') : t('firstEntry')}</div>
      <div className="tar-ms-grid">
        <label className="tar-ms-field wide">
          <span className="lbl">{t('date')}</span>
          <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {MAIN_FIELDS.map(numberField)}

        <div className="tar-ms-xtra">
          {EXTRA_FIELDS.map(numberField)}
          <label className="tar-ms-field">
            <span className="lbl">{t('notes')}</span>
            <input
              type="text"
              name="notes"
              defaultValue={initial?.notes ?? ''}
              placeholder={t('notesPlaceholder')}
            />
          </label>
        </div>

        <button
          type="button"
          className={`tar-ms-more${open ? ' open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="lbl">{open ? t('lessFields') : t('moreFields')}</span>
          <ChevronDown className="i" strokeWidth={2.5} />
        </button>
      </div>
      <button type="submit" className="tar-cta tar-ms-save">
        {t('save')}
      </button>
    </form>
  )
}
