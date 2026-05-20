'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { SetRow } from './SetRow'
import { LoggedSetRow } from './LoggedSetRow'
import { RestTimer } from './RestTimer'
import { PRBadge } from './PRBadge'
import { LastTimeHint } from './LastTimeHint'
import { PlateCalculator } from './PlateCalculator'
import { ExerciseNoteEditor } from './ExerciseNoteEditor'
import { ExerciseVideo } from './ExerciseVideo'
import { Button } from '@/components/ui/button'
import type { ExerciseWithSets, SetEntry, PRResult } from '@/lib/types/models'

interface Props {
  exercise: ExerciseWithSets
  sessionId: string
  onSetSaved: (set: SetEntry) => void
  onDelete: () => void
  lastSets?: SetEntry[]
  initialNote?: string
  initialVideoUrl?: string
}

export function ExerciseBlock({ exercise, sessionId, onSetSaved, onDelete, lastSets = [], initialNote = '', initialVideoUrl = '' }: Props) {
  const locale = useLocale()
  const tHistory = useTranslations('history')
  const t = useTranslations('workout')
  const [sets, setSets] = useState<SetEntry[]>(exercise.sets)
  const [showInfo, setShowInfo] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [lastPR, setLastPR] = useState<PRResult | null>(null)

  const lastSet = sets[sets.length - 1]
  const displayName = locale === 'ru' ? (exercise.name_ru ?? exercise.name) : exercise.name
  const muscleLabel = tHistory(`muscleLabel.${exercise.primary_muscle}`)
  const thumbnail = exercise.image_urls?.[0]
  const instructions = locale === 'ru'
    ? (exercise.instructions_ru ?? exercise.instructions_en)
    : exercise.instructions_en
  const isBodyweight = exercise.equipment === 'bodyweight'

  function handleSetSaved(set: SetEntry, prResult: PRResult) {
    setSets(prev => [...prev, set])
    onSetSaved(set)
    setShowTimer(true)
    setLastPR(prResult.is_pr ? prResult : null)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden">

      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        {thumbnail && (
          <img src={thumbnail} alt={displayName}
            className="w-11 h-11 rounded-sm object-cover flex-shrink-0 bg-white/5"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate">{displayName}</p>
            {sets.length > 0 && (
              <span className="text-[10px] font-mono font-black bg-amber-500 text-black px-1.5 py-0.5 rounded-sm flex-shrink-0">
                {sets.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{muscleLabel} · {exercise.equipment}</p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {instructions && (
            <Button variant="ghost" size="sm"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200"
              onClick={() => setShowInfo(v => !v)}
            >
              {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {sets.length === 0 && (
            <Button variant="ghost" size="sm"
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
        <div className="px-4 py-3 border-b border-white/10 bg-black/30 animate-in fade-in duration-150">
          <p className="text-xs text-zinc-400 leading-relaxed">{instructions}</p>
        </div>
      )}

      {/* logged sets */}
      {sets.length > 0 && (
        <div className="px-4 pt-3 pb-1 space-y-0.5">
          {sets.map((set, i) => (
            <LoggedSetRow
              key={set.id}
              set={set}
              isLast={i === sets.length - 1}
              isBodyweight={isBodyweight}
              onUpdated={(updated) =>
                setSets(prev => prev.map(s => s.id === updated.id ? updated : s))
              }
              onDeleted={(setId) =>
                setSets(prev => prev.filter(s => s.id !== setId))
              }
            />
          ))}
        </div>
      )}

      {/* PR + rest timer — owned by ExerciseBlock, above the new set input */}
      {(lastPR || showTimer) && (
        <div className="px-4 pt-2 pb-1 space-y-1 border-t border-white/10">
          {lastPR && <PRBadge pr={lastPR} />}
          {showTimer && (
            <RestTimer seconds={90} onDone={() => setShowTimer(false)} />
          )}
        </div>
      )}

      {/* always-visible new set row */}
      <div className="px-4 pt-3 pb-4 border-t border-white/10 space-y-2">
        {/* "Last time" comparison — always show when we have history */}
        {lastSets.length > 0 && (
          sets.length === 0 ? (
            <LastTimeHint sets={lastSets} />
          ) : (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span className="font-bold">{t('lastTime')}:</span>
              <span className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {lastSets.map(s => `${s.weight_kg}×${s.reps}`).slice(0, 4).join(' · ')}
                {lastSets.length > 4 ? ` +${lastSets.length - 4}` : ''}
              </span>
            </div>
          )
        )}

        <ExerciseVideo exerciseId={exercise.id} initialUrl={initialVideoUrl} />
        <ExerciseNoteEditor exerciseId={exercise.id} initialNote={initialNote} />

        <SetRow
          sessionId={sessionId}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={lastSet?.weight_kg ?? lastSets[0]?.weight_kg}
          defaultReps={lastSet?.reps ?? lastSets[0]?.reps}
          isBodyweight={isBodyweight}
          onSaved={handleSetSaved}
        />
        {exercise.equipment === 'barbell' && (lastSet?.weight_kg ?? lastSets[0]?.weight_kg) && (
          <PlateCalculator weightKg={lastSet?.weight_kg ?? lastSets[0]?.weight_kg ?? 0} />
        )}
      </div>

    </div>
  )
}
