'use client'

// Inline button shown above the first SetRow of an exercise. Generates a
// 3-step warm-up ramp (50/70/85% × 8/5/3) based on the planned working
// weight, saves them as is_warmup=true rows so they don't pollute volume
// or PR analytics.

import { useState, useTransition } from 'react'
import { Flame, Loader2 } from 'lucide-react'
import { addWarmupSetsAction } from '@/app/(app)/workout/[id]/actions'
import { calculateWarmupSets } from '@/lib/services/warmup.service'
import type { SetEntry } from '@/lib/types/models'

interface Props {
  sessionId: string
  exerciseId: string
  workingWeightKg: number
  onAdded: (sets: SetEntry[]) => void
}

export function WarmupButton({ sessionId, exerciseId, workingWeightKg, onAdded }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const plan = calculateWarmupSets(workingWeightKg)
  if (plan.length === 0) return null

  function handleClick() {
    if (done) return
    startTransition(async () => {
      try {
        const { sets } = await addWarmupSetsAction({
          sessionId,
          exerciseId,
          workingWeightKg,
          startingSetNumber: 1,
        })
        onAdded(sets)
        setDone(true)
      } catch {
        // Surface via global error reporter; UI just stays clickable
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || done}
      className="w-full flex items-center gap-2 rounded-xl p-2.5 transition active:scale-[0.98] disabled:opacity-50"
      style={{
        background: 'rgba(255, 196, 68, 0.08)',
        border: '1px solid rgba(255, 196, 68, 0.28)',
      }}
    >
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#FFC044' }} />
        ) : (
          <Flame className="h-3.5 w-3.5" style={{ color: '#FFC044' }} />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FFC044' }}>
          Разминка
        </p>
        <p className="mt-0.5 text-[11px] text-white/55 leading-tight truncate">
          {plan.map(s => `${s.weightKg}×${s.reps}`).join(' · ')}
        </p>
      </div>

      <span className="shrink-0 text-[9px] uppercase tracking-widest text-white/40">
        {done ? '✓' : 'добавить'}
      </span>
    </button>
  )
}
