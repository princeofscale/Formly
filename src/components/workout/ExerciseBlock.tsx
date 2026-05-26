'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { MuscleIcon } from './muscle-icon'
import { SetRow } from './SetRow'
import { LoggedSetRow } from './LoggedSetRow'
import { RestTimer } from './RestTimer'
import { PRBadge } from './PRBadge'
import { LastTimeHint } from './LastTimeHint'
import { ExerciseNoteEditor } from './ExerciseNoteEditor'
import { ExerciseVideo } from './ExerciseVideo'
import { ProgressionHint } from './ProgressionHint'
import { WarmupButton } from './WarmupButton'
import { ExerciseAlternativesPanel } from './ExerciseAlternativesPanel'
import { suggestNextSet } from '@/lib/services/progression.service'
import { Button } from '@/components/ui/button'
import type { Exercise, ExerciseWithSets, SetEntry, PRResult } from '@/lib/types/models'

interface Props {
  exercise: ExerciseWithSets
  sessionId: string
  onSetSaved: (set: SetEntry) => void
  onPR?: (info: { exerciseName: string; newE1rm: number; improvementPct: number | null }) => void
  onDelete: (opts: { hadSets: boolean }) => void
  onReplace?: (replacement: Exercise) => void
  lastSets?: SetEntry[]
  initialNote?: string
  initialVideoUrl?: string
}

export function ExerciseBlock({
  exercise,
  sessionId,
  onSetSaved,
  onPR,
  onDelete,
  onReplace,
  lastSets = [],
  initialNote = '',
  initialVideoUrl = '',
}: Props) {
  const locale = useLocale()
  const tHistory = useTranslations('history')
  const t = useTranslations('workout')
  const [sets, setSets] = useState<SetEntry[]>(exercise.sets)
  const [showInfo, setShowInfo] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [lastPR, setLastPR] = useState<PRResult | null>(null)
  const [applied, setApplied] = useState<{ weight: number; reps: number; nonce: number } | null>(
    null,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  const lastSet = sets[sets.length - 1]
  const displayName = locale === 'ru' ? (exercise.name_ru ?? exercise.name) : exercise.name
  const muscleLabel = tHistory(`muscleLabel.${exercise.primary_muscle}`)
  const thumbnail = exercise.image_urls?.[0]
  const instructions =
    locale === 'ru'
      ? (exercise.instructions_ru ?? exercise.instructions_en)
      : exercise.instructions_en
  const isBodyweight = exercise.equipment === 'bodyweight'

  // Before the first set use the prior session's data; once the user has logged
  // a set this session, base the suggestion on what they just did (RPE/reps
  // from the freshest set drive the next-set delta).
  const setsForSuggestion = sets.length > 0 ? sets : lastSets
  const suggestion =
    !isBodyweight && setsForSuggestion.length > 0 ? suggestNextSet(setsForSuggestion) : null

  function handleSetSaved(set: SetEntry, prResult: PRResult) {
    setSets((prev) => [...prev, set])
    onSetSaved(set)
    setShowTimer(true)
    setLastPR(prResult.is_pr ? prResult : null)
    if (prResult.is_pr && onPR) {
      onPR({
        exerciseName: displayName,
        newE1rm: prResult.current_1rm ?? set.calculated_1rm ?? 0,
        improvementPct: prResult.improvement_pct ?? null,
      })
    }
  }

  return (
    <div className="tar-w-active" style={{ margin: 0 }}>
      {/* header — tar-w-active-head */}
      <div className="tar-w-active-head relative" style={{ zIndex: 3 }}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={displayName}
            width={48}
            height={48}
            className="tar-w-group-icon"
            style={{ background: 'none', border: 'none', padding: 0, objectFit: 'cover' }}
          />
        ) : (
          <div className="tar-w-group-icon">
            <MuscleIcon muscle={exercise.primary_muscle} style={{ width: 22, height: 22 }} />
          </div>
        )}
        <div className="min-w-0">
          <div className="tar-w-ex-title truncate">{displayName}</div>
          <div className="tar-w-ex-meta">
            {sets.length > 0 && (
              <span className="tar-w-set-pill">
                {t('setShort')} {sets.length}
              </span>
            )}
            <span>{muscleLabel}</span>
          </div>
        </div>
        <div className="tar-w-ex-actions">
          {instructions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200"
              onClick={() => setShowInfo((v) => !v)}
            >
              {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {sets.length === 0 && onReplace && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-600 hover:text-amber-400"
              title={t('alternatives.button')}
              onClick={() => setShowAlternatives((v) => !v)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400"
            title={t('deleteExercise')}
            onClick={() => {
              if (sets.length === 0) {
                onDelete({ hadSets: false })
              } else {
                setConfirmDelete(true)
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showAlternatives && onReplace && (
        <ExerciseAlternativesPanel
          exerciseId={exercise.id}
          onPick={(replacement) => {
            setShowAlternatives(false)
            onReplace(replacement)
          }}
          onClose={() => setShowAlternatives(false)}
        />
      )}

      {confirmDelete && (
        <div className="px-4 py-3 border-b border-white/10 bg-red-500/5 flex items-center gap-2 animate-in fade-in duration-150">
          <p className="flex-1 text-xs text-zinc-300">
            {t('confirmDeleteExercise', { n: sets.length })}
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="h-8 px-3 rounded-sm bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false)
              onDelete({ hadSets: true })
            }}
            className="h-8 px-3 rounded-sm bg-red-500 hover:bg-red-400 text-xs font-bold text-white"
          >
            {t('deleteExercise')}
          </button>
        </div>
      )}

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
                setSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              }
              onDeleted={(setId) => setSets((prev) => prev.filter((s) => s.id !== setId))}
            />
          ))}
        </div>
      )}

      {/* PR + rest timer — owned by ExerciseBlock, above the new set input */}
      {(lastPR || showTimer) && (
        <div className="px-4 pt-2 pb-1 space-y-1 border-t border-white/10">
          {lastPR && <PRBadge pr={lastPR} />}
          {showTimer && <RestTimer seconds={90} onDone={() => setShowTimer(false)} />}
        </div>
      )}

      {/* always-visible new set row */}
      <div className="px-4 pt-3 pb-4 border-t border-white/10 space-y-2">
        {/* "Last time" comparison — always show when we have history */}
        {lastSets.length > 0 &&
          (sets.length === 0 ? (
            <LastTimeHint sets={lastSets} />
          ) : (
            <div
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <span className="font-bold">{t('lastTime')}:</span>
              <span className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {lastSets
                  .map((s) => `${s.weight_kg}×${s.reps}`)
                  .slice(0, 4)
                  .join(' · ')}
                {lastSets.length > 4 ? ` +${lastSets.length - 4}` : ''}
              </span>
            </div>
          ))}

        <ExerciseVideo exerciseId={exercise.id} initialUrl={initialVideoUrl} />
        <ExerciseNoteEditor exerciseId={exercise.id} initialNote={initialNote} />

        {suggestion && (
          <ProgressionHint
            suggestion={suggestion}
            onApply={(w, r) => setApplied({ weight: w, reps: r, nonce: Date.now() })}
          />
        )}

        {sets.length === 0 &&
          !isBodyweight &&
          (lastSet?.weight_kg ?? lastSets[0]?.weight_kg ?? 0) >= 30 && (
            <WarmupButton
              sessionId={sessionId}
              exerciseId={exercise.id}
              workingWeightKg={lastSet?.weight_kg ?? lastSets[0]?.weight_kg ?? 0}
              onAdded={(warmups) => setSets((prev) => [...prev, ...warmups])}
            />
          )}

        <SetRow
          sessionId={sessionId}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={lastSet?.weight_kg ?? lastSets[0]?.weight_kg}
          defaultReps={lastSet?.reps ?? lastSets[0]?.reps}
          appliedSuggestion={applied}
          isBodyweight={isBodyweight}
          showPlateCalculator={exercise.equipment === 'barbell'}
          onSaved={handleSetSaved}
        />
      </div>
    </div>
  )
}
