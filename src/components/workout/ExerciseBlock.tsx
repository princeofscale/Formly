'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { SetRow } from './SetRow'
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
      {/* exercise header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={displayName}
            className="w-11 h-11 rounded-sm object-cover flex-shrink-0 bg-zinc-800"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate">{displayName}</p>
            {sets.length > 0 && (
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-sm flex-shrink-0">
                {sets.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{muscleLabel} · {exercise.equipment}</p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {instructions && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200" onClick={() => setShowInfo(v => !v)}>
              {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200" onClick={() => setShowCalc(v => !v)}>
            🏋️
          </Button>
          {sets.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400"
              title={t('deleteExercise')}
              onClick={onDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* instructions */}
      {showInfo && instructions && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 animate-in fade-in duration-150">
          <p className="text-xs text-zinc-400 leading-relaxed">{instructions}</p>
        </div>
      )}

      {/* plate calc */}
      {showCalc && lastWeight && (
        <div className="px-4 pb-3 pt-2 border-b border-zinc-800 animate-in fade-in duration-150">
          <PlateCalculator weightKg={lastWeight} />
        </div>
      )}

      {/* logged sets */}
      {sets.length > 0 && (
        <div className="px-4 pt-2 pb-1 space-y-0.5">
          {sets.map((set, i) => {
            const isLast = i === sets.length - 1
            return (
              <div
                key={set.id}
                className={`flex items-center gap-3 py-1 text-sm animate-in fade-in slide-in-from-top-1 duration-200 ${isLast ? 'border-l-2 border-amber-500 pl-2 -ml-2' : 'text-zinc-500'}`}
              >
                <span className="font-mono text-[11px] text-zinc-600 w-5">#{set.set_number}</span>
                <span className={`font-mono font-bold ${isLast ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {set.weight_kg}<span className="text-zinc-600 font-normal text-[11px]">kg</span>
                  <span className="text-zinc-600 mx-1">×</span>
                  {set.reps}
                </span>
                {set.rpe && (
                  <span className="text-[11px] text-zinc-600">{t('rpe')} {set.rpe}</span>
                )}
                {set.calculated_1rm && isLast && (
                  <span className="text-[11px] text-zinc-600 ml-auto">1ПМ {set.calculated_1rm.toFixed(0)}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* new set row */}
      <div className="px-4 py-3">
        <SetRow
          sessionId={sessionId}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={lastWeight}
          defaultReps={lastReps}
          onSaved={handleSetSaved}
        />
      </div>
    </div>
  )
}
