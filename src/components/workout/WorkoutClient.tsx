'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { BookmarkPlus, Check } from 'lucide-react'
import type { WorkoutSession, Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'
import { ExerciseSearch } from './ExerciseSearch'
import { ExerciseBlock } from './ExerciseBlock'
import { FinishWorkoutButton } from './FinishWorkoutButton'
import { getLastSetsForExerciseAction, saveTemplateAction, updateTemplateAction } from '@/app/(app)/workout/[id]/actions'

interface Props {
  session: WorkoutSession
  initialExercises: ExerciseWithSets[]
  allExercises: Exercise[]
  lastSetsMap?: Record<string, SetEntry[]>
  sourceTemplate?: { id: string; name: string }
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

export function WorkoutClient({ session, initialExercises, allExercises, lastSetsMap: initialLastSets, sourceTemplate }: Props) {
  const t = useTranslations('workout')
  const tTpl = useTranslations('templates')
  const locale = useLocale()
  const elapsed = useElapsed(session.started_at)

  const [exercises, setExercises] = useState<ExerciseWithSets[]>(initialExercises)
  const [lastSetsMap, setLastSetsMap] = useState<Record<string, SetEntry[]>>(initialLastSets ?? {})

  // Template saving state
  const [showTplInput, setShowTplInput] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplSaved, setTplSaved] = useState(false)
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [, startFetch] = useTransition()
  const [, startSave] = useTransition()

  function addExercise(exercise: Exercise) {
    if (exercises.some(e => e.id === exercise.id)) return
    setExercises(prev => [...prev, { ...exercise, sets: [] }])
    startFetch(async () => {
      const lastSets = await getLastSetsForExerciseAction(exercise.id, session.id)
      setLastSetsMap(prev => ({ ...prev, [exercise.id]: lastSets }))
    })
  }

  function appendSet(exerciseId: string, set: SetEntry) {
    setExercises(prev =>
      prev.map(e => e.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e)
    )
  }

  function removeExercise(exerciseId: string) {
    setExercises(prev => prev.filter(e => e.id !== exerciseId))
  }

  function buildExerciseList() {
    return exercises.map(ex => ({
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
      setTimeout(() => { setShowTplInput(false); setTplSaved(false) }, 1800)
    })
  }

  function handleSaveTemplate() {
    if (!tplName.trim()) return
    startSave(async () => {
      await saveTemplateAction(tplName.trim(), buildExerciseList())
      setTplSaved(true)
      setTimeout(() => { setShowTplInput(false); setTplSaved(false); setTplName('') }, 1800)
    })
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
        <div className="flex items-center gap-2">
          {exercises.length > 0 && (
            <button
              onClick={() => { setShowTplInput(v => !v); setSaveAsNew(false) }}
              className="h-9 w-9 flex items-center justify-center rounded-sm bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 transition-colors"
              title={tTpl('saveAsTemplate')}
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
          )}
          <FinishWorkoutButton sessionId={session.id} />
        </div>
      </div>

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
                onChange={e => setTplName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
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
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">{t('emptyHint')}</p>
        </div>
      )}

      <div className="space-y-3 pt-1">
        {exercises.map(ex => (
          <div key={ex.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            <ExerciseBlock
              exercise={ex}
              sessionId={session.id}
              onSetSaved={(set) => appendSet(ex.id, set)}
              onDelete={() => removeExercise(ex.id)}
              lastSets={lastSetsMap[ex.id] ?? []}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
