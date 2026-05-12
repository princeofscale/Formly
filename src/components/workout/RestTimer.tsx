'use client'

import { useState, useEffect } from 'react'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface Props {
  seconds: number
  onDone: () => void
}

export function RestTimer({ seconds, onDone }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onDone(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onDone])

  const pct = remaining / seconds
  const offset = CIRCUMFERENCE * (1 - pct)

  const color = remaining > 45 ? '#22c55e' : remaining > 20 ? '#eab308' : '#ef4444'
  const textColor = remaining > 45 ? 'text-green-400' : remaining > 20 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-3 py-1 animate-in fade-in duration-300">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#27272a" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-sm tabular-nums ${textColor}`}>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="text-xs text-zinc-500 leading-snug">
        {remaining > 0 ? 'Отдыхаем...' : 'Время!'}
      </div>
    </div>
  )
}
