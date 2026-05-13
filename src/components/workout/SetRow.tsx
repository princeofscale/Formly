'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { saveSetAction } from '@/app/(app)/workout/[id]/actions'
import type { SetEntry, PRResult } from '@/lib/types/models'

interface StepperProps {
  label: string
  value: string
  onChange: (v: string) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  optional?: boolean
}

function Stepper({ label, value, onChange, step = 1, min, max, suffix, optional }: StepperProps) {
  const num = parseFloat(value) || 0

  function decrement() {
    if (optional && !value) return
    const next = Math.round((num - step) * 100) / 100
    if (min !== undefined && next < min) {
      if (optional) onChange('')
      return
    }
    onChange(String(next))
  }

  function increment() {
    const base = optional && !value ? (min ?? 1) - step : num
    const next = Math.round((base + step) * 100) / 100
    if (max !== undefined && next > max) return
    onChange(String(next))
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{label}</p>
      <div className="flex items-center h-11 bg-white/5 border border-white/10 rounded-sm overflow-hidden focus-within:border-amber-500/50 transition-colors">
        <button
          type="button"
          onClick={decrement}
          className="w-10 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors text-lg flex-shrink-0 select-none"
        >−</button>
        <div className="flex-1 flex items-center justify-center min-w-0">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={optional ? '—' : ''}
            className="w-full text-center font-mono font-bold text-base bg-transparent border-none outline-none text-white placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {value && suffix && (
            <span className="text-[10px] text-zinc-600 mr-2 flex-shrink-0">{suffix}</span>
          )}
        </div>
        <button
          type="button"
          onClick={increment}
          className="w-10 h-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors text-lg flex-shrink-0 select-none"
        >+</button>
      </div>
    </div>
  )
}

interface Props {
  sessionId: string
  exerciseId: string
  setNumber: number
  defaultWeight?: number
  defaultReps?: number
  onSaved: (set: SetEntry, prResult: PRResult) => void
}

export function SetRow({ sessionId, exerciseId, setNumber, defaultWeight, defaultReps = 8, onSaved }: Props) {
  const t = useTranslations('workout')
  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : '')
  const [reps, setReps] = useState(String(defaultReps))
  const [rpe, setRpe] = useState('')
  const [isPending, startTransition] = useTransition()

  const canSave = !!(parseFloat(weight) && parseInt(reps))

  function handleSave() {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (!w || !r) return
    // Clamp RPE to DB constraint [1, 10] — user may type directly bypassing stepper limits
    const rpeVal = rpe ? Math.max(1, Math.min(10, parseFloat(rpe))) : undefined
    startTransition(async () => {
      const { set, prResult } = await saveSetAction({
        sessionId, exerciseId, setNumber,
        weightKg: w, reps: r,
        rpe: rpeVal,
      })
      onSaved(set, prResult)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
        {t('setLabel', { n: setNumber })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stepper label={t('weightLabel')} value={weight} onChange={setWeight} step={2.5} min={0} suffix="кг" />
        <Stepper label={t('repsLabel')} value={reps} onChange={setReps} step={1} min={1} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stepper label={t('rpeLabel')} value={rpe} onChange={setRpe} step={1} min={1} max={10} optional />
        <div className="space-y-1">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 opacity-0 select-none">_</p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isPending}
            className={`w-full h-11 rounded-sm font-black text-sm tracking-wider transition-all ${
              canSave && !isPending
                ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black'
                : 'bg-white/5 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isPending ? '…' : '✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
