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
    const next = sorted.find((d) => d > todayISO) ?? sorted[0]
    nextDayLabel = `${labels.next}: ${labels.days[String(next)]}`
  }

  return (
    <div
      className={`flex h-full min-h-[68px] items-center gap-3 rounded-[18px] px-3 py-2.5 ring-1 ${
        isGymDay ? 'bg-emerald-400/10 ring-emerald-300/15' : 'bg-card ring-white/[0.06]'
      }`}
    >
      {isGymDay ? (
        <Dumbbell className="h-4 w-4 shrink-0 text-emerald-300" />
      ) : (
        <Moon className="h-4 w-4 shrink-0 text-white/40" />
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide">
          {isGymDay ? labels.trainingDay : labels.restDay}
        </p>
        {!isGymDay && (
          <p className="mt-0.5 text-[11px] text-white/40">
            {schedule.length === 0 ? labels.noSchedule : nextDayLabel}
          </p>
        )}
      </div>
    </div>
  )
}
