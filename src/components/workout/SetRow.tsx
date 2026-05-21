'use client'

import { useState, useTransition, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { saveSetAction } from '@/app/(app)/workout/[id]/actions'
import type { SetEntry, PRResult } from '@/lib/types/models'
import { PlateCalculator } from './PlateCalculator'

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
  isBodyweight?: boolean
  showPlateCalculator?: boolean
  /** Imperative override from "tap to apply" suggestion — bumps state when nonce changes. */
  appliedSuggestion?: { weight: number; reps: number; nonce: number } | null
  onSaved: (set: SetEntry, prResult: PRResult) => void
}

const QUICK_INCREMENTS = [-5, -2.5, 2.5, 5]

export function SetRow({ sessionId, exerciseId, setNumber, defaultWeight, defaultReps = 8, isBodyweight = false, showPlateCalculator = false, appliedSuggestion, onSaved }: Props) {
  const t = useTranslations('workout')
  const draftKey = `setdraft:${sessionId}:${exerciseId}:${setNumber}`

  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : '')
  const [reps, setReps] = useState(String(defaultReps))
  const [rpe, setRpe] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Restore draft from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const draft = readDraft(draftKey)
    if (draft) {
      setWeight(draft.weight)
      setReps(draft.reps)
      setRpe(draft.rpe)
    }
    setHydrated(true)
  }, [draftKey])

  // Apply a one-tap suggestion: bump weight/reps whenever the nonce changes
  useEffect(() => {
    if (!appliedSuggestion) return
    setWeight(String(appliedSuggestion.weight))
    setReps(String(appliedSuggestion.reps))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSuggestion?.nonce])

  // Persist draft as user types
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    if (!weight && !rpe && reps === String(defaultReps)) {
      window.localStorage.removeItem(draftKey)
      return
    }
    window.localStorage.setItem(draftKey, JSON.stringify({ weight, reps, rpe }))
  }, [weight, reps, rpe, draftKey, defaultReps, hydrated])

  // For bodyweight exercises, weight is optional (empty = pure BW, value = added weight or assistance)
  const canSave = isBodyweight
    ? !!parseInt(reps)
    : !!(parseFloat(weight) && parseInt(reps))

  function applyQuickInc(delta: number) {
    const base = parseFloat(weight) || (defaultWeight ?? 0)
    const next = Math.max(0, Math.round((base + delta) * 100) / 100)
    setWeight(String(next))
  }

  function handleSave() {
    const r = parseInt(reps)
    if (!r) return
    const w = parseFloat(weight)
    // For bodyweight, store 0 when no extra weight; otherwise weight must be > 0
    const weightToSave = isBodyweight ? (Number.isFinite(w) ? w : 0) : w
    if (!isBodyweight && !weightToSave) return
    const rpeVal = rpe ? Math.max(1, Math.min(10, parseFloat(rpe))) : undefined
    startTransition(async () => {
      const { set, prResult } = await saveSetAction({
        sessionId, exerciseId, setNumber,
        weightKg: weightToSave, reps: r,
        rpe: rpeVal,
      })
      if (typeof window !== 'undefined') window.localStorage.removeItem(draftKey)
      onSaved(set, prResult)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
        {t('setLabel', { n: setNumber })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stepper
          label={isBodyweight ? t('extraWeightLabel') : t('weightLabel')}
          value={weight}
          onChange={setWeight}
          step={2.5}
          min={0}
          suffix={isBodyweight && !weight ? 'BW' : 'кг'}
          optional={isBodyweight}
        />
        <Stepper label={t('repsLabel')} value={reps} onChange={setReps} step={1} min={1} />
      </div>

      {/* Quick increments */}
      <div className="flex items-center gap-1.5">
        {QUICK_INCREMENTS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => applyQuickInc(d)}
            className="flex-1 h-7 rounded-[6px] text-[10px] font-mono font-bold tracking-tight transition-colors"
            style={{
              background: d > 0 ? 'rgba(255, 59, 71, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: d > 0 ? '1px solid rgba(255, 59, 71, 0.22)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: d > 0 ? '#FF6E76' : 'rgba(255, 255, 255, 0.55)',
            }}
          >
            {d > 0 ? '+' : ''}{d}
          </button>
        ))}
      </div>

      {showPlateCalculator && <PlateCalculator weightKg={parseFloat(weight) || 0} />}

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

function readDraft(key: string): { weight: string; reps: string; rpe: string } | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.weight === 'string' && typeof parsed?.reps === 'string' && typeof parsed?.rpe === 'string') {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}
