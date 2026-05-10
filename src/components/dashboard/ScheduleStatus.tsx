import { Dumbbell, Moon } from 'lucide-react'

interface Props {
  schedule: number[]  // ISO weekdays: 1=Mon, 2=Tue, ..., 7=Sun
}

export function ScheduleStatus({ schedule }: Props) {
  const todayISO = new Date().getDay() || 7  // JS getDay(): Sun=0 → convert to 7
  const isGymDay = schedule.includes(todayISO)

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${isGymDay ? 'bg-green-900/30 border border-green-800' : 'bg-zinc-800 border border-zinc-700'}`}>
      {isGymDay ? <Dumbbell className="h-5 w-5 text-green-400" /> : <Moon className="h-5 w-5 text-zinc-400" />}
      <div>
        <p className="font-medium text-sm">{isGymDay ? 'Training Day' : 'Rest Day'}</p>
        <p className="text-xs text-zinc-400">
          {schedule.length === 0
            ? 'No schedule set'
            : `Training: ${schedule.map(d => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`}
        </p>
      </div>
    </div>
  )
}
