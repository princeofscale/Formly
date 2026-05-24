'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { saveBodyMetricsAction } from '@/app/(app)/progress/actions'

interface Props {
  initialWeight: number | null
  initialHeight: number | null
  labels: {
    weight: string
    height: string
    weightUnit: string
    heightUnit: string
    save: string
    saved: string
  }
}

function numberOrEmpty(value: number | null): string {
  return value ? String(value) : ''
}

export function BodyWeightCard({ initialWeight, initialHeight, labels }: Props) {
  const [weight, setWeight] = useState(numberOrEmpty(initialWeight))
  const [height, setHeight] = useState(numberOrEmpty(initialHeight))
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const weightNum = Number(weight)
  const heightNum = Number(height)
  const canSave = Number.isFinite(weightNum) && weightNum > 0 && Number.isFinite(heightNum) && heightNum > 0

  function save() {
    if (!canSave) return
    startTransition(async () => {
      try {
        await saveBodyMetricsAction(weightNum, heightNum)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        console.error('[metrics] save failed:', e)
      }
    })
  }

  return (
    <div
      className="space-y-4 rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {labels.weight} / {labels.height}
        </h3>
        {saved && (
          <div className="flex items-center gap-1 text-[10px] animate-in fade-in" style={{ color: '#FF3B47' }}>
            <Check className="h-3 w-3" />
            <span>{labels.saved}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/45">{labels.weight}</span>
          <div className="flex items-baseline gap-2 rounded-[14px] bg-white/[0.05] px-3 py-3 ring-1 ring-white/[0.08]">
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none"
            />
            <span className="text-xs text-white/45">{labels.weightUnit}</span>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/45">{labels.height}</span>
          <div className="flex items-baseline gap-2 rounded-[14px] bg-white/[0.05] px-3 py-3 ring-1 ring-white/[0.08]">
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.1"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none"
            />
            <span className="text-xs text-white/45">{labels.heightUnit}</span>
          </div>
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!canSave || isPending}
        className="h-11 w-full rounded-[14px] bg-primary text-sm font-black uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/25"
      >
        {isPending ? labels.save : labels.save}
      </button>
    </div>
  )
}
