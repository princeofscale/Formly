'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Check, X } from 'lucide-react'
import { addMeasurementAction } from '@/app/(app)/body/actions'

interface FieldDef {
  name: 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'biceps_cm' | 'body_fat_pct'
  labelKey: string
  unit: 'kg' | 'cm' | 'pct'
  step: string
}

const FIELDS: FieldDef[] = [
  { name: 'weight_kg',    labelKey: 'weight',  unit: 'kg',  step: '0.1' },
  { name: 'chest_cm',     labelKey: 'chest',   unit: 'cm',  step: '0.5' },
  { name: 'waist_cm',     labelKey: 'waist',   unit: 'cm',  step: '0.5' },
  { name: 'hips_cm',      labelKey: 'hips',    unit: 'cm',  step: '0.5' },
  { name: 'biceps_cm',    labelKey: 'biceps',  unit: 'cm',  step: '0.5' },
  { name: 'body_fat_pct', labelKey: 'bodyFat', unit: 'pct', step: '0.1' },
]

export function MeasurementForm() {
  const t = useTranslations('body')
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const todayIso = new Date().toISOString().slice(0, 10)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMeasurementAction(formData)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
      }, 1500)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-xl font-bold text-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: '0 8px 24px rgba(245,158,11,0.25)',
        }}
      >
        <Plus className="h-4 w-4" />
        {t('addEntry')}
      </button>
    )
  }

  return (
    <form
      action={handleSubmit}
      className="p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">{t('addEntry')}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('today')}</label>
        <input
          type="date"
          name="date"
          defaultValue={todayIso}
          required
          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(field => (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {tLabel(field.labelKey)} ({tUnit(field.unit)})
            </label>
            <input
              type="number"
              name={field.name}
              step={field.step}
              min={field.name === 'body_fat_pct' ? '0' : '0.1'}
              max={field.name === 'body_fat_pct' ? '100' : undefined}
              className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white font-mono text-sm"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending || saved}
        className="w-full h-11 rounded-xl font-bold text-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> {t('saved')}
          </>
        ) : isPending ? (
          t('saving')
        ) : (
          t('save')
        )}
      </button>
    </form>
  )
}
