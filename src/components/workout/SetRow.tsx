'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

export function SetRow({ sessionId, exerciseId, setNumber, defaultWeight, defaultReps = 8, onSaved }: Props) {
  const [weight, setWeight] = useState(defaultWeight ? String(defaultWeight) : '')
  const [reps, setReps] = useState(String(defaultReps))
  const [rpe, setRpe] = useState('')
  const [saved, setSaved] = useState(false)
  const [pr, setPr] = useState<PRResult | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [isPending, startTransition] = useTransition()

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
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 w-8">#{setNumber}</span>
          <span className="font-medium">{weight}kg × {reps}</span>
          {rpe && <span className="text-zinc-500">RPE {rpe}</span>}
          <Check className="h-4 w-4 text-green-500 ml-auto" />
          {pr && <PRBadge pr={pr} />}
        </div>
        {showTimer && <RestTimer seconds={90} onDone={() => setShowTimer(false)} />}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-sm w-8">#{setNumber}</span>
      <div className="flex gap-2 items-center flex-1">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeight(v => String(Math.max(0, parseFloat(v || '0') - 2.5)))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">−</button>
          <Input value={weight} onChange={e => setWeight(e.target.value)} className="w-20 text-center bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="kg" />
          <button onClick={() => setWeight(v => String(parseFloat(v || '0') + 2.5))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">+</button>
        </div>
        <span className="text-zinc-600">×</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setReps(v => String(Math.max(1, parseInt(v || '1') - 1)))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">−</button>
          <Input value={reps} onChange={e => setReps(e.target.value)} className="w-16 text-center bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="reps" />
          <button onClick={() => setReps(v => String(parseInt(v || '0') + 1))} className="px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">+</button>
        </div>
        <Input value={rpe} onChange={e => setRpe(e.target.value)} className="w-16 bg-zinc-900 border-zinc-700 h-8 text-sm" placeholder="RPE" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={isPending || !weight || !reps}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  )
}
