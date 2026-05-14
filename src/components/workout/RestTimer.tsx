'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STORAGE_KEY = 'gymlog_rest_duration'

interface Props {
  /** Default rest duration in seconds (overridden by user's saved preference) */
  seconds: number
  onDone: () => void
}

const PRESETS: { label: string; value: number }[] = [
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '3:00', value: 180 },
  { label: '5:00', value: 300 },
]

function getInitialDuration(fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const n = saved ? parseInt(saved, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function RestTimer({ seconds, onDone }: Props) {
  const t = useTranslations('workout')
  const [duration, setDuration] = useState(() => getInitialDuration(seconds))
  const [remaining, setRemaining] = useState(() => getInitialDuration(seconds))
  const vibratedRef = useRef(false)

  // Persist preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, String(duration))
  }, [duration])

  // Tick down
  useEffect(() => {
    if (remaining <= 0) {
      if (!vibratedRef.current) {
        navigator.vibrate?.([200, 100, 200])
        vibratedRef.current = true
      }
      onDone()
      return
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onDone])

  function applyPreset(value: number) {
    setDuration(value)
    setRemaining(value)
    vibratedRef.current = false
  }

  const pct = duration > 0 ? remaining / duration : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const stroke = remaining > 45 ? '#22c55e' : remaining > 20 ? '#eab308' : '#ef4444'
  const textColor = remaining > 45 ? 'text-green-400' : remaining > 20 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-2 py-1 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#27272a" strokeWidth="4" />
            <circle
              cx="32" cy="32" r={RADIUS}
              fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center font-mono font-black text-sm tabular-nums ${textColor}`}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs text-zinc-400">{t('resting')}</p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-1 rounded-sm hover:bg-white/10"
        >
          {t('restSkip')}
        </button>
      </div>

      <div className="flex gap-1">
        {PRESETS.map(p => {
          const active = duration === p.value
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              className={`flex-1 h-7 rounded-md text-[10px] font-mono font-bold transition-colors ${
                active
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
