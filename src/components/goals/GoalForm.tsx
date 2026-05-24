'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Target } from 'lucide-react'
import { createGoalAction } from '@/app/(app)/goals/actions'
import { weightUnit } from '@/lib/units'

interface ExerciseOption {
  id: string
  name: string
  name_ru: string | null
}

interface Props {
  exercises: ExerciseOption[]
}

export function GoalForm({ exercises }: Props) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '')

  return (
    <form
      action={createGoalAction}
      className="rounded-[20px] p-5 space-y-4"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 196, 68, 0.16)' }}
        >
          <Target className="h-4 w-4" style={{ color: '#FFC044' }} />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#FFC044' }}
          >
            {t('newGoal')}
          </p>
          <p className="text-sm font-bold text-white">{t('newGoalTitle')}</p>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-white/40">{t('exercise')}</span>
        <select
          name="exerciseId"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id} className="bg-zinc-900 text-white">
              {locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {t('targetE1rm')} <span className="text-white/25">({kg})</span>
          </span>
          <input
            type="number"
            inputMode="decimal"
            name="targetE1rm"
            step="0.5"
            min="0.5"
            placeholder="100"
            required
            className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm tabular-nums text-white outline-none ring-1 ring-white/10 placeholder:text-white/20 focus:ring-white/30"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {t('targetDate')}
          </span>
          <input
            type="date"
            name="targetDate"
            className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98]"
      >
        {t('save')}
      </button>
    </form>
  )
}
