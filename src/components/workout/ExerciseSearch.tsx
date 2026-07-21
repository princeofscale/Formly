'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Search, Plus, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslations, useLocale } from 'next-intl'
import {
  searchExercisesAction,
  suggestExercisesAction,
  type ExerciseSuggestion,
} from '@/app/(app)/workout/[id]/actions'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import type { Exercise } from '@/lib/types/models'

interface Props {
  onSelect: (exercise: Exercise) => void
}

export function ExerciseSearch({ onSelect }: Props) {
  const t = useTranslations('workout')
  const tForm = useTranslations('exerciseForm')
  const tHistory = useTranslations('history')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [searched, setSearched] = useState(false)
  const [, startTransition] = useTransition()
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null)
  const [aiItems, setAiItems] = useState<ExerciseSuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const aiAskedFor = useRef<string>('')

  function handleChange(value: string) {
    setQuery(value)
    setSearched(false)
    setAiItems([])
    if (value.length < 2) {
      setResults([])
      return
    }
    startTransition(async () => {
      const found = await searchExercisesAction(value, locale)
      setResults(found)
      setSearched(true)
    })
  }

  // Auto AI fallback: fires once per query, 800 ms after typing stops, only
  // when the normal (+fuzzy) search came back empty and we're online.
  useEffect(() => {
    if (!searched || results.length > 0 || query.length < 2) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (aiAskedFor.current === query) return
    let cancelled = false
    const timer = setTimeout(() => {
      aiAskedFor.current = query
      setAiLoading(true)
      void suggestExercisesAction(query)
        .then((items) => {
          if (!cancelled) setAiItems(items)
        })
        .catch(() => {
          if (!cancelled) setAiItems([])
        })
        .finally(() => {
          if (!cancelled) setAiLoading(false)
        })
    }, 800)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, searched, results.length])

  function select(ex: Exercise) {
    onSelect(ex)
    setQuery('')
    setResults([])
    setAiItems([])
    setSearched(false)
  }

  function displayName(ex: Exercise): string {
    return locale === 'ru' && ex.name_ru ? ex.name_ru : ex.name
  }

  const showCreateHint = query.length >= 2 && searched && results.length === 0

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder={t('searchPlaceholder')}
          className="pl-9 bg-white/5 border-zinc-700"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
      {(results.length > 0 || showCreateHint) && (
        <ul className="absolute z-10 w-full mt-1 bg-black/80 border border-white/10 rounded-md shadow-lg max-h-72 overflow-y-auto backdrop-blur-sm">
          {results.map((ex) => {
            const thumb = ex.image_urls?.[0]
            return (
              <li key={ex.id}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-3"
                  onClick={() => select(ex)}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0 bg-white/5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{displayName(ex)}</p>
                    <p className="text-xs text-zinc-500">
                      {tHistory(`muscleLabel.${ex.primary_muscle}`)}
                    </p>
                  </div>
                  {ex.is_custom && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest flex-shrink-0 px-1.5 py-0.5 rounded-sm"
                      style={{ background: 'rgba(255, 59, 71, 0.18)', color: '#FF6E76' }}
                    >
                      {tForm('customBadge')}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          {showCreateHint && aiLoading && (
            <li className="px-3 py-3 flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#FF6E76' }} />
              {t('aiSearching')}
            </li>
          )}
          {showCreateHint && !aiLoading && aiItems.length > 0 && (
            <>
              <li className="px-3 pt-3 pb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Sparkles className="h-3 w-3" style={{ color: '#FF6E76' }} />
                {t('aiDidYouMean')}
              </li>
              {aiItems.map(({ exercise, reason }) => {
                const aiThumb = exercise.image_urls?.[0]
                return (
                  <li key={exercise.id}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-3"
                      onClick={() => select(exercise)}
                    >
                      {aiThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={aiThumb}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{displayName(exercise)}</p>
                        <p className="text-xs text-zinc-500 truncate">{reason}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </>
          )}
          {showCreateHint && (
            <li className="border-t border-white/10">
              <button
                type="button"
                onClick={() => setFormOpenFor(query)}
                className="w-full text-left px-3 py-3 hover:bg-white/10 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255, 59, 71, 0.15)' }}
                >
                  <Plus className="h-5 w-5" style={{ color: '#FF6E76' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                    {tForm('createCta')} «{query}»
                  </p>
                  <p className="text-xs text-zinc-500">{tForm('createCtaSub')}</p>
                </div>
              </button>
            </li>
          )}
        </ul>
      )}

      {formOpenFor !== null && (
        <ExerciseForm
          key={formOpenFor}
          prefilledName={formOpenFor}
          defaultOpen
          onDismiss={() => setFormOpenFor(null)}
          onCreated={(exercise) => {
            setFormOpenFor(null)
            select(exercise)
          }}
        />
      )}
    </div>
  )
}
