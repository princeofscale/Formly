'use client'

import { useState } from 'react'
import Model from 'react-body-highlighter'
import type { Muscle, IExerciseData, IMuscleStats } from 'react-body-highlighter'
import type { MuscleVolume } from '@/lib/types/models'

const HIGHLIGHT_COLORS = ['#fde68a', '#fbbf24', '#d97706', '#b45309', '#92400e']

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

function setsToFrequency(sets: number): number {
  if (sets <= 2) return 1
  if (sets <= 5) return 2
  if (sets <= 9) return 3
  if (sets <= 14) return 4
  return 5
}

interface Props {
  muscleVolumes: MuscleVolume[]
  muscleLabels: Record<string, string>
  clickHint: string
  setsLabel: string
}

export function MuscleHeatmap({ muscleVolumes, muscleLabels, clickHint, setsLabel }: Props) {
  const [selected, setSelected] = useState<{ name: string; sets: number } | null>(null)

  const activeVolumes = muscleVolumes.filter(mv => mv.total_sets > 0 && MUSCLE_MAP[mv.muscle])

  const data: IExerciseData[] = activeVolumes.map(mv => ({
    name: mv.muscle,
    muscles: [MUSCLE_MAP[mv.muscle]],
    frequency: setsToFrequency(mv.total_sets),
  }))

  function handleClick(stats: IMuscleStats) {
    const match = activeVolumes.find(mv => MUSCLE_MAP[mv.muscle] === stats.muscle)
    if (!match) return
    setSelected({ name: match.muscle, sets: match.total_sets })
  }

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">{clickHint}</p>
  }

  const topMuscles = [...activeVolumes].sort((a, b) => b.total_sets - a.total_sets).slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="flex justify-center items-start gap-6">
        <Model
          data={data}
          style={{ width: '160px', padding: '5px' }}
          highlightedColors={HIGHLIGHT_COLORS}
          onClick={handleClick}
          bodyColor="#3f3f46"
        />
        <Model
          data={data}
          type="posterior"
          style={{ width: '160px', padding: '5px' }}
          highlightedColors={HIGHLIGHT_COLORS}
          onClick={handleClick}
          bodyColor="#3f3f46"
        />
      </div>

      <div className="min-h-[32px] flex items-center justify-center">
        {selected ? (
          <div className="flex items-center gap-2 bg-zinc-800 border border-amber-500/40 rounded px-3 py-1.5 text-sm">
            <span className="font-semibold text-amber-400">
              {muscleLabels[selected.name] ?? selected.name}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="font-mono text-white">{selected.sets}</span>
            <span className="text-zinc-400">{setsLabel}</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">{clickHint}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {topMuscles.map(mv => {
          const freq = setsToFrequency(mv.total_sets)
          const color = HIGHLIGHT_COLORS[freq - 1]
          return (
            <div key={mv.muscle} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-zinc-300">{muscleLabels[mv.muscle] ?? mv.muscle}</span>
              </div>
              <span className="font-mono text-zinc-500">{mv.total_sets}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
