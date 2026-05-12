'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { X } from 'lucide-react'
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
  onDelete: () => void
}

export function ExerciseBlock({ exercise, sessionId, onSetSaved, onDelete }: Props) {
  const locale = useLocale()
  const tHistory = useTranslations('history')
  const t = useTranslations('workout')
  const [sets, setSets] = useState<SetEntry[]>(exercise.sets)
  const [showCalc, setShowCalc] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const lastWeight = sets[sets.length - 1]?.weight_kg
  const lastReps = sets[sets.length - 1]?.reps

  const displayName = locale === 'ru' ? (exercise.name_ru ?? exercise.name) : exercise.name
  const muscleLabel = tHistory(`muscleLabel.${exercise.primary_muscle}`)
  const thumbnail = exercise.image_urls?.[0]
  const instructions = locale === 'ru'
    ? (exercise.instructions_ru ?? exercise.instructions_en)
    : exercise.instructions_en

  function handleSetSaved(set: SetEntry) {
    setSets(prev => [...prev, set])
    onSetSaved(set)
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={displayName}
              className="w-12 h-12 rounded object-cover flex-shrink-0 bg-zinc-800"
            />
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{displayName}</CardTitle>
            <p className="text-xs text-zinc-500">{muscleLabel} · {exercise.equipment}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {instructions && (
              <Button variant="ghost" size="sm" onClick={() => setShowInfo(v => !v)}>
                ℹ️
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowCalc(v => !v)}>
              🏋️
            </Button>
            {sets.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-500 hover:text-red-400"
                title={t('deleteExercise')}
                onClick={onDelete}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {showCalc && lastWeight && <PlateCalculator weightKg={lastWeight} />}
        {showInfo && instructions && (
          <p className="text-xs text-zinc-400 leading-relaxed mt-2 border-t border-zinc-800 pt-2">
            {instructions}
          </p>
        )}
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
