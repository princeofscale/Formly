'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SetRow } from './SetRow'
import { LastTimeHint } from './LastTimeHint'
import { PlateCalculator } from './PlateCalculator'
import { Button } from '@/components/ui/button'
import type { ExerciseWithSets, SetEntry } from '@/lib/types/models'

interface Props {
  exercise: ExerciseWithSets
  sessionId: string
  onSetSaved: (set: SetEntry) => void
}

export function ExerciseBlock({ exercise, sessionId, onSetSaved }: Props) {
  const [sets, setSets] = useState<SetEntry[]>(exercise.sets)
  const [showCalc, setShowCalc] = useState(false)

  const lastWeight = sets[sets.length - 1]?.weight_kg
  const lastReps = sets[sets.length - 1]?.reps

  function handleSetSaved(set: SetEntry) {
    setSets(prev => [...prev, set])
    onSetSaved(set)
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            <p className="text-xs text-zinc-500 capitalize">{exercise.primary_muscle} · {exercise.equipment}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCalc(v => !v)}>
            🏋️
          </Button>
        </div>
        {showCalc && lastWeight && <PlateCalculator weightKg={lastWeight} />}
      </CardHeader>
      <CardContent className="space-y-3">
        <LastTimeHint sets={[]} />

        {sets.map(set => (
          <div key={set.id} className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="w-8">#{set.set_number}</span>
            <span>{set.weight_kg}kg × {set.reps}</span>
          </div>
        ))}

        <SetRow
          sessionId={sessionId}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={lastWeight}
          defaultReps={lastReps}
          onSaved={handleSetSaved}
        />
      </CardContent>
    </Card>
  )
}
