'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, Check } from 'lucide-react'
import { saveBodyWeightAction } from '@/app/(app)/progress/actions'

interface Props {
  initial: number
  labelKg: string
}

const MIN = 40
const MAX = 200
const STEP = 0.5

function clamp(v: number) {
  return Math.min(MAX, Math.max(MIN, Math.round(v * 2) / 2))
}

export function BodyWeightCard({ initial, labelKg }: Props) {
  const [value, setValue] = useState<number>(clamp(initial))
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save(next: number) {
    startTransition(async () => {
      try {
        await saveBodyWeightAction(next)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        console.error('[weight] save failed:', e)
      }
    })
  }

  function decrement() {
    const next = clamp(value - STEP)
    setValue(next)
    save(next)
  }

  function increment() {
    const next = clamp(value + STEP)
    setValue(next)
    save(next)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const next = clamp(parseFloat(e.target.value))
    setValue(next)
  }

  function handleSliderEnd() {
    save(value)
  }

  // Slider range — show 60-90 by default but allow full range
  const sliderMin = 40
  const sliderMax = 150
  const pct = ((value - sliderMin) / (sliderMax - sliderMin)) * 100

  return (
    <div
      className="rounded-[20px] p-5 space-y-4"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {labelKg}
        </h3>
        {saved && (
          <div className="flex items-center gap-1 text-[10px] animate-in fade-in" style={{ color: '#FF3B47' }}>
            <Check className="h-3 w-3" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={decrement}
          disabled={isPending || value <= MIN}
          className="w-12 h-12 rounded-[14px] flex items-center justify-center transition-all hover:scale-95 active:scale-90 disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Minus className="h-5 w-5 text-white" />
        </button>

        <div className="text-center min-w-[140px]">
          <div className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: '#FFFFFF' }}>
            {value.toFixed(1)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>кг</div>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={isPending || value >= MAX}
          className="w-12 h-12 rounded-[14px] flex items-center justify-center transition-all hover:scale-95 active:scale-90 disabled:opacity-40"
          style={{
            background: 'rgba(255, 59, 71, 0.15)',
            border: '1px solid rgba(255, 59, 71, 0.35)',
            boxShadow: '0 0 16px rgba(255, 59, 71, 0.2)',
          }}
        >
          <Plus className="h-5 w-5" style={{ color: '#FF3B47' }} />
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-1.5 px-1">
        <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              background: 'linear-gradient(90deg, rgba(255,59,71,0.5), #FF3B47)',
              boxShadow: '0 0 8px rgba(255,59,71,0.5)',
            }}
          />
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={STEP}
            value={value}
            onChange={handleSlider}
            onMouseUp={handleSliderEnd}
            onTouchEnd={handleSliderEnd}
            className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer opacity-0"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none transition-all"
            style={{
              left: `calc(${Math.max(0, Math.min(100, pct))}% - 8px)`,
              background: '#FF3B47',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 12px rgba(255,59,71,0.6)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>{sliderMin}</span>
          <span>{sliderMax}</span>
        </div>
      </div>
    </div>
  )
}
