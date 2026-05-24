'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Ruler } from 'lucide-react'
import { saveMeasurementAction } from '@/app/(app)/progress/measurements/actions'
import type { BodyMeasurement } from '@/lib/db/body-measurements'
import { lengthUnit, weightUnit } from '@/lib/units'

interface Props {
  initial: BodyMeasurement | null
  defaultDate: string
}

const FIELDS: Array<{ key: keyof BodyMeasurement; unit: 'weight' | 'length' | 'percent'; step: string }> = [
  { key: 'weight_kg',   unit: 'weight',  step: '0.1' },
  { key: 'body_fat_pct', unit: 'percent',  step: '0.1' },
  { key: 'waist_cm',    unit: 'length',  step: '0.1' },
  { key: 'chest_cm',    unit: 'length',  step: '0.1' },
  { key: 'hips_cm',     unit: 'length',  step: '0.1' },
  { key: 'biceps_cm',   unit: 'length',  step: '0.1' },
  { key: 'thigh_cm',    unit: 'length',  step: '0.1' },
  { key: 'calf_cm',     unit: 'length',  step: '0.1' },
  { key: 'neck_cm',     unit: 'length',  step: '0.1' },
]

export function MeasurementForm({ initial, defaultDate }: Props) {
  const t = useTranslations('progress.measurements')
  const locale = useLocale()
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const unitLabel = (unit: (typeof FIELDS)[number]['unit']) => {
    if (unit === 'weight') return weightUnit(locale)
    if (unit === 'length') return lengthUnit(locale)
    return '%'
  }

  return (
    <form
      action={saveMeasurementAction}
      className="rounded-[20px] p-5 space-y-4"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34, 211, 168, 0.14)' }}
        >
          <Ruler className="h-4 w-4" style={{ color: '#22D3A8' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#22D3A8' }}>
            {t('label')}
          </p>
          <p className="text-sm font-bold text-white">{t('formTitle')}</p>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-white/40">{t('date')}</span>
        <input
          type="date"
          name="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map(f => (
          <label key={f.key} className="block">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {t(`fields.${f.key}`)} <span className="text-white/25">({unitLabel(f.unit)})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              name={f.key}
              step={f.step}
              defaultValue={initial?.[f.key] != null ? String(initial[f.key]) : ''}
              placeholder="—"
              className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm tabular-nums text-white outline-none ring-1 ring-white/10 placeholder:text-white/20 focus:ring-white/30"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-white/40">{t('notes')}</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={initial?.notes ?? ''}
          placeholder={t('notesPlaceholder')}
          className="mt-1 w-full resize-none rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-white/30"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98]"
      >
        {t('save')}
      </button>
    </form>
  )
}
