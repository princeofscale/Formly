// src/components/dashboard/WeeklyStats.tsx
interface Props {
  tonnage: number
  sessions: number
  bestE1rm: number | null
  labels: { tonnage: string; sessions: string; bestE1rm: string }
}

export function WeeklyStats({ tonnage, sessions, bestE1rm, labels }: Props) {
  return (
    <div className="grid grid-cols-3 rounded-sm overflow-hidden border border-white/10">
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-white/5">
        <span className="font-mono text-2xl font-bold text-amber-500">
          {tonnage.toFixed(0)}
        </span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.tonnage}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-white/5 border-x border-white/10">
        <span className="font-mono text-2xl font-bold text-amber-500">{sessions}</span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.sessions}</span>
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
