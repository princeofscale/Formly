'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { WorkoutSession, Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { ExerciseSearch } from './ExerciseSearch'
import { ExerciseBlock } from './ExerciseBlock'
import { FinishWorkoutButton } from './FinishWorkoutButton'

interface Props {
  session: WorkoutSession
  initialExercises: ExerciseWithSets[]
  allExercises: Exercise[]
}

function useElapsed(startedAt: string) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  )
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function WorkoutClient({ session, initialExercises, allExercises }: Props) {
  const t = useTranslations('workout')
  const [exercises, setExercises] = useState<ExerciseWithSets[]>(initialExercises)
  const elapsed = useElapsed(session.started_at)

  function addExercise(exercise: Exercise) {
    if (exercises.some(e => e.id === exercise.id)) return
    setExercises(prev => [...prev, { ...exercise, sets: [] }])
  }

  function appendSet(exerciseId: string, set: SetEntry) {
    setExercises(prev =>
      prev.map(e => e.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e)
    )
  }

  function removeExercise(exerciseId: string) {
    setExercises(prev => prev.filter(e => e.id !== exerciseId))
  }

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)

  return (
    <div className="space-y-4 pb-24">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="font-mono text-amber-500 text-sm font-bold tabular-nums">{elapsed}</span>
            {totalSets > 0 && (
              <span className="text-xs text-zinc-500">{totalSets} sets</span>
            )}
          </div>
        </div>
        <FinishWorkoutButton sessionId={session.id} />
      </div>

      {/* sticky search */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-zinc-800/50">
        <ExerciseSearch onSelect={addExercise} />
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-zinc-400 text-sm">{t('emptyHint')}</p>
        </div>
      )}

      <div className="space-y-3 pt-1">
        {exercises.map(ex => (
          <div
            key={ex.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <ExerciseBlock
              exercise={ex}
              sessionId={session.id}
              onSetSaved={(set) => appendSet(ex.id, set)}
              onDelete={() => removeExercise(ex.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
