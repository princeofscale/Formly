'use client'

// Full-screen mobile exercise picker. The whole catalog lives client-side,
// so browsing and search are instant and work offline; the AI did-you-mean
// fallback (server action) kicks in only when local search finds nothing.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CloudOff, Plus, Search, Sparkles, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { suggestExercisesAction, type ExerciseSuggestion } from '@/app/(app)/workout/[id]/actions'
import {
  filterExercises,
  matchesChip,
  MUSCLE_CHIPS,
  normalizeQuery,
  type MuscleChip,
} from '@/lib/utils/exercise-filter'
import type { Exercise } from '@/lib/types/models'

interface Props {
  allExercises: Exercise[]
  recentExercises: Exercise[]
  sessionExerciseIds: string[]
  onSelect: (exercise: Exercise) => void
}

const CHIP_LABEL_KEY: Record<MuscleChip, string> = {
  all: 'chipAll',
  chest: 'chipChest',
  back: 'chipBack',
  shoulders: 'chipShoulders',
  biceps: 'chipBiceps',
  triceps: 'chipTriceps',
  legs: 'chipLegs',
  core: 'chipCore',
  other: 'chipOther',
}

export function ExercisePicker({
  allExercises,
  recentExercises,
  sessionExerciseIds,
  onSelect,
}: Props) {
  const t = useTranslations('workout')
  const tForm = useTranslations('exerciseForm')
  const tHistory = useTranslations('history')
  const locale = useLocale()

  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState(allExercises)
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState<MuscleChip>('all')
  const [aiItems, setAiItems] = useState<ExerciseSuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null)
  const aiAskedFor = useRef<string>('')

  const inSession = useMemo(() => new Set(sessionExerciseIds), [sessionExerciseIds])

  function displayName(ex: Exercise): string {
    return locale === 'ru' && ex.name_ru ? ex.name_ru : ex.name
  }

  const sortedAll = useMemo(
    () =>
      [...catalog].sort((a, b) =>
        (locale === 'ru' ? (a.name_ru ?? a.name) : a.name).localeCompare(
          locale === 'ru' ? (b.name_ru ?? b.name) : b.name,
          locale,
        ),
      ),
    [catalog, locale],
  )

  const searching = query.trim().length >= 2
  const results = useMemo(
    () => (searching ? filterExercises(catalog, query, chip) : []),
    [catalog, query, chip, searching],
  )
  const browseAll = useMemo(
    () => (searching ? [] : sortedAll.filter((ex) => matchesChip(ex, chip))),
    [sortedAll, chip, searching],
  )
  const browseRecent = useMemo(
    () =>
      searching
        ? []
        : recentExercises.filter((ex) => matchesChip(ex, chip) && !inSession.has(ex.id)),
    [recentExercises, chip, searching, inSession],
  )

  // Body scroll lock + Escape while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // AI fallback: fires once per query, 800 ms after typing stops, only when
  // local search came back empty and we're online.
  useEffect(() => {
    if (!open || !searching || results.length > 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const requestKey = `${chip}:${normalizeQuery(query)}`
    if (aiAskedFor.current === requestKey) return
    let cancelled = false
    const timer = setTimeout(() => {
      aiAskedFor.current = requestKey
      setAiLoading(true)
      void suggestExercisesAction(query)
        .then((items) => {
          if (!cancelled) {
            setAiItems(items.filter(({ exercise }) => matchesChip(exercise, chip)))
          }
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
  }, [open, searching, results.length, query, chip])

  function changeQuery(value: string) {
    setQuery(value)
    setAiItems([])
    setAiLoading(false)
  }

  function changeChip(value: MuscleChip) {
    setChip(value)
    setAiItems([])
    setAiLoading(false)
  }

  function close() {
    setOpen(false)
    setQuery('')
    setChip('all')
    setAiItems([])
    setAiLoading(false)
    setFormOpenFor(null)
  }

  function select(ex: Exercise) {
    onSelect(ex)
    close()
  }

  function row(ex: Exercise, reason?: string) {
    const added = inSession.has(ex.id)
    const thumb = ex.image_urls?.[0]
    return (
      <li key={ex.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}>
        <button
          type="button"
          disabled={added}
          onClick={() => select(ex)}
          className={`w-full text-left px-4 py-2.5 min-h-14 flex items-center gap-3 hover:bg-white/10 active:bg-white/10 ${added ? 'opacity-50' : ''}`}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="w-10 h-10 rounded object-cover flex-shrink-0 bg-white/5"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{displayName(ex)}</p>
            <p className="text-xs text-zinc-500 truncate">
              {reason ?? tHistory(`muscleLabel.${ex.primary_muscle}`)}
            </p>
          </div>
          {added && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex-shrink-0">
              <Check className="h-3.5 w-3.5" />
              {t('added')}
            </span>
          )}
        </button>
      </li>
    )
  }

  function sectionHeader(label: string) {
    return (
      <li className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </li>
    )
  }

  if (!open) {
    return (
      <button type="button" className="tar-cta w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t('pickerExercise')}
      </button>
    )
  }

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--tar-bg, #0a0a0f)' }}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={close}
          aria-label={t('cancel')}
          className="w-10 h-10 rounded-xl grid place-items-center bg-white/5 border border-white/10 flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            autoFocus
            placeholder={t('searchPlaceholder')}
            className="pl-9 bg-white/5 border-zinc-700"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto [scrollbar-width:none]">
        {MUSCLE_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => changeChip(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border ${
              chip === c
                ? 'border-transparent text-black'
                : 'border-white/10 bg-white/5 text-zinc-300'
            }`}
            style={
              chip === c ? { background: 'linear-gradient(135deg, #ff6b35, #ffb627)' } : undefined
            }
          >
            {t(CHIP_LABEL_KEY[c])}
          </button>
        ))}
      </div>

      <ul className="flex-1 overflow-y-auto overscroll-contain pb-8">
        {!searching && browseRecent.length > 0 && (
          <>
            {sectionHeader(t('recent'))}
            {browseRecent.map((ex) => row(ex))}
          </>
        )}
        {!searching && (
          <>
            {sectionHeader(t('allExercisesSection'))}
            {browseAll.map((ex) => row(ex))}
          </>
        )}

        {searching && results.map((ex) => row(ex))}

        {searching && results.length === 0 && (
          <>
            {aiLoading && (
              <li className="px-4 py-3 flex items-center gap-2 text-xs text-zinc-400">
                <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#FF6E76' }} />
                {t('aiSearching')}
              </li>
            )}
            {!aiLoading && aiItems.length > 0 && (
              <>
                <li className="px-4 pt-3 pb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <Sparkles className="h-3 w-3" style={{ color: '#FF6E76' }} />
                  {t('aiDidYouMean')}
                </li>
                {aiItems.map(({ exercise, reason }) => row(exercise, reason))}
              </>
            )}
            {offline && !aiLoading && aiItems.length === 0 && (
              <li className="px-4 py-3 flex items-center gap-2 text-xs text-zinc-500">
                <CloudOff className="h-4 w-4" />
                {t('aiOffline')}
              </li>
            )}
            <li className="border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={() => setFormOpenFor(query)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255, 59, 71, 0.15)' }}
                >
                  <Plus className="h-5 w-5" style={{ color: '#FF6E76' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">
                    {tForm('createCta')} «{query}»
                  </p>
                  <p className="text-xs text-zinc-500">{tForm('createCtaSub')}</p>
                </div>
              </button>
            </li>
          </>
        )}
      </ul>

      {formOpenFor !== null && (
        <ExerciseForm
          key={formOpenFor}
          prefilledName={formOpenFor}
          defaultOpen
          onDismiss={() => setFormOpenFor(null)}
          onCreated={(exercise) => {
            setCatalog((current) =>
              current.some((item) => item.id === exercise.id) ? current : [...current, exercise],
            )
            select(exercise)
          }}
        />
      )}
    </div>,
    document.body,
  )
}
