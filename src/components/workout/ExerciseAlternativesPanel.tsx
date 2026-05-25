'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Sparkles, Loader2 } from 'lucide-react'
import type { Exercise } from '@/lib/types/models'
import {
  suggestExerciseAlternativesAction,
  type AlternativeWithExercise,
} from '@/app/(app)/workout/[id]/actions'

interface Props {
  exerciseId: string
  onPick: (replacement: Exercise) => void
  onClose: () => void
}

export function ExerciseAlternativesPanel({ exerciseId, onPick, onClose }: Props) {
  const locale = useLocale()
  const t = useTranslations('workout.alternatives')
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; items: AlternativeWithExercise[] }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const items = await suggestExerciseAlternativesAction(exerciseId)
        if (!cancelled) setState({ kind: 'ready', items })
      } catch (e) {
        if (!cancelled) {
          setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  return (
    <div className="px-4 py-3 border-b border-white/10 bg-amber-500/[0.03] space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-amber-400/80 font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          {t('title')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-white/40 hover:text-white/70"
        >
          {t('close')}
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-white/55 py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('loading')}
        </div>
      )}

      {state.kind === 'ready' && state.items.length === 0 && (
        <p className="text-xs text-white/45 py-2">{t('none')}</p>
      )}

      {state.kind === 'ready' &&
        state.items.map(({ exercise, reason }) => {
          const name = locale === 'ru' ? (exercise.name_ru ?? exercise.name) : exercise.name
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => onPick(exercise)}
              className="w-full flex items-start gap-3 rounded-lg p-3 text-left transition bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                <p className="text-[11px] text-white/55 leading-tight mt-0.5">{reason}</p>
              </div>
            </button>
          )
        })}

      {state.kind === 'error' && (
        <div className="text-xs text-red-300 py-2 space-y-1">
          <p>{t('error')}</p>
          <p className="font-mono text-[10px] text-white/40 break-all">{state.message}</p>
        </div>
      )}
    </div>
  )
}
