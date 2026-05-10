import type { VolumeLandmark } from '@/lib/types/models'

const STATUS_CONFIG = {
  mv: { label: 'Low (MV)', color: 'text-yellow-400 bg-yellow-900/30' },
  optimal: { label: 'Optimal', color: 'text-green-400 bg-green-900/30' },
  mrv: { label: 'Very High', color: 'text-red-400 bg-red-900/30' },
}

export function VolumeLandmarks({ landmarks }: { landmarks: VolumeLandmark[] }) {
  if (landmarks.length === 0) {
    return <p className="text-zinc-500 text-sm">Log workouts to see volume status.</p>
  }

  return (
    <div className="space-y-2">
      {landmarks.map(l => {
        const config = STATUS_CONFIG[l.status]
        return (
          <div key={l.muscle} className="flex items-center justify-between">
            <span className="text-sm capitalize">{l.muscle.replace('_', ' ')}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{l.weekly_sets} sets/wk</span>
              <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>{config.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
