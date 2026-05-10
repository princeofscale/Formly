'use client'

import Model from 'react-body-highlighter'
import type { Muscle, IExerciseData } from 'react-body-highlighter'
import type { MuscleVolume } from '@/lib/types/models'

const MUSCLE_MAP: Record<string, Muscle> = {
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
  front_delts: 'front-deltoids',
  side_delts: 'front-deltoids',
  rear_delts: 'back-deltoids',
}

interface Props {
  muscleVolumes: MuscleVolume[]
}

export function MuscleHeatmap({ muscleVolumes }: Props) {
  const data: IExerciseData[] = muscleVolumes
    .filter(mv => mv.total_sets > 0 && MUSCLE_MAP[mv.muscle])
    .map(mv => ({
      name: mv.muscle,
      muscles: [MUSCLE_MAP[mv.muscle]],
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
