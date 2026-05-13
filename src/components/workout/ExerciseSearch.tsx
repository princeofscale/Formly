'use client'

import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTranslations, useLocale } from 'next-intl'
import { searchExercisesAction } from '@/app/(app)/workout/[id]/actions'
import type { Exercise } from '@/lib/types/models'

interface Props {
  onSelect: (exercise: Exercise) => void
}

export function ExerciseSearch({ onSelect }: Props) {
  const t = useTranslations('workout')
  const tHistory = useTranslations('history')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    setQuery(value)
    if (value.length < 2) { setResults([]); return }
    startTransition(async () => {
      const found = await searchExercisesAction(value, locale)
      setResults(found)
    })
  }

  function select(ex: Exercise) {
    onSelect(ex)
    setQuery('')
    setResults([])
  }

  function displayName(ex: Exercise): string {
    return locale === 'ru' && ex.name_ru ? ex.name_ru : ex.name
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder={t('searchPlaceholder')}
          className="pl-9 bg-white/5 border-zinc-700"
          value={query}
          onChange={e => handleChange(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-black/80 border border-white/10 rounded-md shadow-lg max-h-72 overflow-y-auto backdrop-blur-sm">
          {results.map(ex => {
            const thumb = ex.image_urls?.[0]
            return (
              <li key={ex.id}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-3"
                  onClick={() => select(ex)}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-white/5" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName(ex)}</p>
                    <p className="text-xs text-zinc-500">{tHistory(`muscleLabel.${ex.primary_muscle}`)}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
