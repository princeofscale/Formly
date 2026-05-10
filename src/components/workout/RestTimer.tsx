'use client'

import { useState, useEffect } from 'react'
import { Timer } from 'lucide-react'

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

  const pct = (remaining / seconds) * 100
  const color = remaining > 30 ? 'text-green-400' : remaining > 10 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-2 text-sm">
      <Timer className="h-4 w-4 text-zinc-500" />
      <span className={`font-mono font-bold ${color}`}>
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
      </span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full">
        <div className="h-1 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
