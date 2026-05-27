'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { BookmarkPlus, Check, ChevronLeft } from 'lucide-react'
import type { WorkoutSession, Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { ExerciseSearch } from './ExerciseSearch'
import { ExerciseBlock } from './ExerciseBlock'
import { PRCelebration, type PRCelebrationData } from './PRCelebration'
import { OfflineSyncWatcher } from './OfflineSyncWatcher'
import { FinishWorkoutButton } from './FinishWorkoutButton'
import { WorkoutNotes } from './WorkoutNotes'
import { MoodSelector } from './MoodSelector'
import { WorkoutLiveStats, WorkoutElapsed } from './WorkoutLiveStats'
import {
  getLastSetsForExerciseAction,
  saveTemplateAction,
  updateTemplateAction,
  deleteExerciseFromSessionAction,
} from '@/app/(app)/workout/[id]/actions'

interface Props {
  session: WorkoutSession
  initialExercises: ExerciseWithSets[]
  allExercises: Exercise[]
  lastSetsMap?: Record<string, SetEntry[]>
  sourceTemplate?: { id: string; name: string }
  suggestedExercises?: Exercise[]
  exerciseNotes?: Record<string, string>
  exerciseVideos?: Record<string, string>
}

export function WorkoutClient({
  session,
  initialExercises,
  lastSetsMap: initialLastSets,
  sourceTemplate,
  suggestedExercises = [],
  exerciseNotes = {},
  exerciseVideos = {},
}: Props) {
  const t = useTranslations('workout')
  const tTpl = useTranslations('templates')
  const locale = useLocale()

  const [exercises, setExercises] = useState<ExerciseWithSets[]>(initialExercises)
  const [lastSetsMap, setLastSetsMap] = useState<Record<string, SetEntry[]>>(initialLastSets ?? {})
  const [prCelebration, setPrCelebration] = useState<PRCelebrationData | null>(null)

  // Template saving state
  const [showTplInput, setShowTplInput] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplSaved, setTplSaved] = useState(false)
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [, startFetch] = useTransition()
  const [, startSave] = useTransition()

  function addExercise(exercise: Exercise) {
    if (exercises.some((e) => e.id === exercise.id)) return
    setExercises((prev) => [...prev, { ...exercise, sets: [] }])
    startFetch(async () => {
      const lastSets = await getLastSetsForExerciseAction(exercise.id, session.id)
      setLastSetsMap((prev) => ({ ...prev, [exercise.id]: lastSets }))
    })
  }

  function appendSet(exerciseId: string, set: SetEntry) {
    setExercises((prev) =>
      prev.map((e) => (e.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e)),
    )
  }

  function removeExercise(exerciseId: string, opts: { hadSets: boolean }) {
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId))
    if (opts.hadSets) {
      startFetch(async () => {
        try {
          await deleteExerciseFromSessionAction({ sessionId: session.id, exerciseId })
        } catch {
          // best-effort: UI already removed; orphaned rows would reappear on reload
        }
      })
    }
  }

  function replaceExercise(oldId: string, replacement: Exercise) {
    // Don't allow swapping if the new exercise is already in the session.
    if (exercises.some((e) => e.id === replacement.id)) {
      setExercises((prev) => prev.filter((e) => e.id !== oldId))
      return
    }
    setExercises((prev) => prev.map((e) => (e.id === oldId ? { ...replacement, sets: [] } : e)))
    startFetch(async () => {
      const lastSets = await getLastSetsForExerciseAction(replacement.id, session.id)
      setLastSetsMap((prev) => ({ ...prev, [replacement.id]: lastSets }))
    })
  }

  function buildExerciseList() {
    return exercises.map((ex) => ({
      exercise_id: ex.id,
      name: ex.name,
      name_ru: ex.name_ru,
      default_weight_kg: ex.sets[ex.sets.length - 1]?.weight_kg ?? null,
      default_reps: ex.sets[ex.sets.length - 1]?.reps ?? null,
    }))
  }

  function handleUpdateTemplate() {
    if (!sourceTemplate) return
    startSave(async () => {
      await updateTemplateAction(sourceTemplate.id, buildExerciseList())
      setTplSaved(true)
      setTimeout(() => {
        setShowTplInput(false)
        setTplSaved(false)
      }, 1800)
    })
  }

  function handleSaveTemplate() {
    if (!tplName.trim()) return
    startSave(async () => {
      await saveTemplateAction(tplName.trim(), buildExerciseList())
      setTplSaved(true)
      setTimeout(() => {
        setShowTplInput(false)
        setTplSaved(false)
        setTplName('')
      }, 1800)
    })
  }

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const totalTonnage = exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0),
    0,
  )

  const weekday = new Date(session.started_at).toLocaleDateString(
    locale === 'ru' ? 'ru-RU' : 'en-US',
    { weekday: 'long' },
  )
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1)

  return (
    <div className="space-y-3 pb-24">
      {/* tar-w-header — back arrow + title + live subtitle + Finish */}
      <header className="tar-w-header">
        <Link href="/dashboard" className="tar-w-iconbtn" aria-label={t('back')}>
          <ChevronLeft className="h-[18px] w-[18px]" />
        </Link>
        <div className="tar-w-title-block">
          <div className="tar-w-title">{t('title')}</div>
          <div className="tar-w-subtitle">
            <span className="tar-w-session-dot" />
            <span>
              <WorkoutElapsed startedAt={session.started_at} />
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{weekdayCap}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exercises.length > 0 && (
            <button
              onClick={() => {
                setShowTplInput((v) => !v)
                setSaveAsNew(false)
              }}
              className="tar-w-iconbtn"
              aria-label={tTpl('saveAsTemplate')}
              title={tTpl('saveAsTemplate')}
            >
              <BookmarkPlus className="h-[18px] w-[18px]" />
            </button>
          )}
          <FinishWorkoutButton sessionId={session.id} />
        </div>
      </header>

      <WorkoutLiveStats
        totalSets={totalSets}
        totalTonnageKg={totalTonnage}
        exerciseCount={exercises.length}
      />

      {/* save as template inline */}
      {showTplInput && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {tplSaved ? (
            <div className="flex items-center gap-2 text-green-400 text-sm px-3 py-2 bg-white/5 rounded-sm border border-white/10 w-full">
              <Check className="h-4 w-4" /> {tTpl('saved')}
            </div>
          ) : sourceTemplate && !saveAsNew ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleUpdateTemplate}
                className="flex-1 h-9 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-sm transition-colors truncate"
              >
                {tTpl('update', { name: sourceTemplate.name })}
              </button>
              <button
                onClick={() => setSaveAsNew(true)}
                className="h-9 px-3 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs rounded-sm transition-colors whitespace-nowrap"
              >
                {tTpl('saveAsNew')}
              </button>
            </div>
          ) : (
            <>
              <input
                autoFocus
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                placeholder={tTpl('namePlaceholder')}
                className="flex-1 h-9 px-3 bg-white/5 border border-white/10 rounded-sm text-sm focus:border-amber-500 outline-none"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!tplName.trim()}
                className="h-9 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-zinc-600 text-black font-bold text-sm rounded-sm transition-colors"
              >
                {tTpl('save')}
              </button>
            </>
          )}
        </div>
      )}

      {/* sticky search */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-white/10">
        <ExerciseSearch onSelect={addExercise} />
      </div>

      {exercises.length === 0 && (
        <div className="space-y-4 py-8">
          <p className="text-center text-zinc-400 text-sm">{t('emptyHint')}</p>
          {suggestedExercises.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center font-bold">
                {t('quickAdd')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedExercises
                  .filter((ex) => !exercises.some((e) => e.id === ex.id))
                  .map((ex) => {
                    const name = locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => addExercise(ex)}
                        className="h-9 px-3 rounded-full text-xs font-medium bg-white/5 border border-white/10 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                      >
                        + {name}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 pt-1">
        {exercises.map((ex) => (
          <div key={ex.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <ExerciseBlock
              exercise={ex}
              sessionId={session.id}
              onSetSaved={(set) => appendSet(ex.id, set)}
              onPR={(info) => setPrCelebration({ ...info, nonce: Date.now() })}
              onDelete={(opts) => removeExercise(ex.id, opts)}
              onReplace={(replacement) => replaceExercise(ex.id, replacement)}
              lastSets={lastSetsMap[ex.id] ?? []}
              initialNote={exerciseNotes[ex.id] ?? ''}
              initialVideoUrl={exerciseVideos[ex.id] ?? ''}
            />
          </div>
        ))}
      </div>

      {exercises.length > 0 && (
        <div className="space-y-3">
          <MoodSelector sessionId={session.id} initialMood={session.mood_score} />
          <WorkoutNotes sessionId={session.id} initialNotes={session.notes} />
        </div>
      )}

      <PRCelebration pr={prCelebration} onDone={() => setPrCelebration(null)} />
      <OfflineSyncWatcher />
    </div>
  )
}
