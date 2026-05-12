'use client'

import { useState } from 'react'
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

export function WorkoutClient({ session, initialExercises, allExercises }: Props) {
  const t = useTranslations('workout')
  const [exercises, setExercises] = useState<ExerciseWithSets[]>(initialExercises)

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

  const started = new Date(session.started_at)
  const duration = Math.round((Date.now() - started.getTime()) / 60000)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-zinc-400">{t('elapsed', { minutes: duration })}</p>
        </div>
        <FinishWorkoutButton sessionId={session.id} />
      </div>

      <ExerciseSearch onSelect={addExercise} />

      {exercises.length === 0 && (
        <p className="text-center text-zinc-500 py-12">
          {t('emptyHint')}
        </p>
      )}

      {exercises.map(ex => (
        <ExerciseBlock
          key={ex.id}
          exercise={ex}
          sessionId={session.id}
          onSetSaved={(set) => appendSet(ex.id, set)}
          onDelete={() => removeExercise(ex.id)}
        />
      ))}
    </div>
  )
}
