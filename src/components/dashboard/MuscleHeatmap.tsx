'use client'

import Model from 'react-body-highlighter'
import type { MuscleVolume } from '@/lib/types/models'

const MUSCLE_MAP: Record<string, string> = {
  chest: 'chest',
  back: 'upper-back',
  lats: 'back-deltoids',
  traps: 'trapezius',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  core: 'abs',
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  calves: 'calves',
  front_delts: 'deltoids',
  side_delts: 'deltoids',
  rear_delts: 'back-deltoids',
}

interface Props {
  muscleVolumes: MuscleVolume[]
}

export function MuscleHeatmap({ muscleVolumes }: Props) {
  const data = muscleVolumes
    .filter(mv => mv.total_sets > 0)
    .map(mv => ({
      name: 'Session',
      muscles: [MUSCLE_MAP[mv.muscle]].filter(Boolean),
    }))

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">Log workouts to see your muscle heatmap.</p>
  }

  return (
    <div className="flex justify-center gap-4">
      <Model
        data={data}
        style={{ width: '120px', padding: '5px' }}
        highlightedColors={['#16a34a', '#15803d', '#166534']}
      />
      <Model
        data={data}
        type="posterior"
        style={{ width: '120px', padding: '5px' }}
        highlightedColors={['#16a34a', '#15803d', '#166534']}
      />
    </div>
  )
}
