// src/components/dashboard/WeeklyStats.tsx
import { ArrowUp, ArrowDown } from 'lucide-react'

interface Props {
  tonnage: number
  sessions: number
  bestE1rm: number | null
  /** Previous week tonnage and sessions for delta display */
  prevTonnage?: number
  prevSessions?: number
  labels: { tonnage: string; sessions: string; bestE1rm: string }
}

function Delta({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === 0 || current === previous) return null
  const diff = current - previous
  const positive = diff > 0
  const Arrow = positive ? ArrowUp : ArrowDown
  const color = positive ? 'text-green-400' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono mt-1 ${color}`}>
      <Arrow className="h-2.5 w-2.5" />
      {positive ? '+' : ''}{Math.abs(diff).toFixed(0)}
    </span>
  )
}

export function WeeklyStats({ tonnage, sessions, bestE1rm, prevTonnage, prevSessions, labels }: Props) {
  return (
    <div className="grid grid-cols-3 rounded-sm overflow-hidden border border-white/10">
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-white/5">
        <span className="font-mono text-2xl font-bold text-amber-500">
          {tonnage.toFixed(0)}
        </span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.tonnage}</span>
        <Delta current={tonnage} previous={prevTonnage} />
      </div>
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-white/5 border-x border-white/10">
        <span className="font-mono text-2xl font-bold text-amber-500">{sessions}</span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.sessions}</span>
        <Delta current={sessions} previous={prevSessions} />
      </div>
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-white/5">
        <span className="font-mono text-2xl font-bold text-amber-500">
          {bestE1rm ? `${bestE1rm.toFixed(0)}` : '—'}
        </span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.bestE1rm}</span>
      </div>
    </div>
  )
}
