// src/components/dashboard/ScheduleStatus.tsx
import { Dumbbell, Moon } from 'lucide-react'

interface Props {
  schedule: number[]
  labels: {
    trainingDay: string
    restDay: string
    next: string
    noSchedule: string
    days: Record<string, string>
  }
}

export function ScheduleStatus({ schedule, labels }: Props) {
  const todayISO = new Date().getDay() || 7
  const isGymDay = schedule.includes(todayISO)

  let nextDayLabel = ''
  if (!isGymDay && schedule.length > 0) {
    const sorted = [...schedule].sort((a, b) => a - b)
    const next = sorted.find(d => d > todayISO) ?? sorted[0]
    nextDayLabel = `${labels.next}: ${labels.days[String(next)]}`
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-sm border-l-4 ${
      isGymDay
        ? 'bg-green-900/20 border-l-green-500 border border-green-900/50'
        : 'bg-white/5 border-l-zinc-600 border border-white/10'
    }`}>
      {isGymDay
        ? <Dumbbell className="h-5 w-5 text-green-400 shrink-0" />
        : <Moon className="h-5 w-5 text-zinc-500 shrink-0" />
      }
      <div>
        <p className="font-bold text-sm uppercase tracking-wide">
          {isGymDay ? labels.trainingDay : labels.restDay}
        </p>
        {!isGymDay && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {schedule.length === 0 ? labels.noSchedule : nextDayLabel}
          </p>
        )}
      </div>
    </div>
  )
}
