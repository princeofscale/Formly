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
          className="pl-9 bg-zinc-900 border-zinc-700"
          value={query}
          onChange={e => handleChange(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map(ex => (
            <li key={ex.id}>
              <button
                className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-sm"
                onClick={() => select(ex)}
              >
                <span className="font-medium">{displayName(ex)}</span>
                <span className="text-zinc-500 ml-2">{ex.primary_muscle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
