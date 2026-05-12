'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { saveSetAction } from '@/app/(app)/workout/[id]/actions'
import { PRBadge } from './PRBadge'
import { RestTimer } from './RestTimer'
import type { SetEntry, PRResult } from '@/lib/types/models'

interface Props {
  sessionId: string
  exerciseId: string
  setNumber: number
  defaultWeight?: number
  defaultReps?: number
  onSaved: (set: SetEntry) => void
}

function Stepper({ value, onChange, step = 1, min = 0, suffix = '' }: {
  value: string
  onChange: (v: string) => void
  step?: number
  min?: number
  suffix?: string
}) {
  const num = parseFloat(value) || 0
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(min, num - step)))}
        className="w-8 h-9 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 text-base font-bold rounded-l-sm transition-colors flex items-center justify-center"
      >−</button>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 h-9 text-center bg-zinc-900 border-x-0 border-zinc-700 rounded-none text-sm font-mono font-bold focus-visible:ring-0 focus-visible:border-amber-500"
        placeholder="—"
      />
      <button
        type="button"
        onClick={() => onChange(String(num + step))}
        className="w-8 h-9 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 text-base font-bold rounded-r-sm transition-colors flex items-center justify-center"
      >+</button>
      {suffix && <span className="ml-1 text-[11px] text-zinc-600">{suffix}</span>}
    </div>
  )
}

export function SetRow({ sessionId, exerciseId, setNumber, defaultWeight, defaultReps = 8, onSaved }: Props) {
  const t = useTranslations('workout')
  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : '')
  const [reps, setReps] = useState(String(defaultReps))
  const [rpe, setRpe] = useState('')
  const [saved, setSaved] = useState(false)
  const [pr, setPr] = useState<PRResult | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canSave = !!(parseFloat(weight) && parseInt(reps))

  function handleSave() {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (!w || !r) return

    startTransition(async () => {
      const { set, prResult } = await saveSetAction({
        sessionId,
        exerciseId,
        setNumber,
        weightKg: w,
        reps: r,
        rpe: rpe ? parseFloat(rpe) : undefined,
      })
      setSaved(true)
      setPr(prResult)
      setShowTimer(true)
      onSaved(set)
    })
  }

  if (saved) {
    return (
      <div className="space-y-2">
        {pr && (
          <div className="animate-in zoom-in-50 duration-300">
            <PRBadge pr={pr} />
          </div>
        )}
        {showTimer && <RestTimer seconds={90} onDone={() => setShowTimer(false)} />}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 font-mono text-xs w-5">#{setNumber}</span>
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        <Stepper value={weight} onChange={setWeight} step={2.5} suffix="kg" />
        <span className="text-zinc-700">×</span>
        <Stepper value={reps} onChange={setReps} step={1} min={1} />
        <Input
          value={rpe}
          onChange={e => setRpe(e.target.value)}
          className="w-14 h-9 text-center bg-zinc-900 border-zinc-700 text-sm font-mono rounded-sm focus-visible:border-amber-500"
          placeholder={t('rpe')}
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !canSave}
        className={`h-9 w-9 flex-shrink-0 rounded-sm flex items-center justify-center transition-colors ${
          canSave && !isPending
            ? 'bg-amber-500 hover:bg-amber-400 text-black'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  )
}
