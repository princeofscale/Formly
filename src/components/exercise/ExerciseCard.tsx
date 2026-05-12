'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Exercise } from '@/lib/types/models'

interface Props {
  exercise: Exercise
  displayName: string
  muscleLabel: string
  equipmentLabel: string
  customLabel: string
  locale: string
}

export function ExerciseCard({ exercise, displayName, muscleLabel, equipmentLabel, customLabel, locale }: Props) {
  const [open, setOpen] = useState(false)
  const thumbnail = exercise.image_urls?.[0]
  const instructions = locale === 'ru'
    ? (exercise.instructions_ru ?? exercise.instructions_en)
    : exercise.instructions_en
  const hasDetails = !!(instructions || (exercise.image_urls && exercise.image_urls.length > 0))

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="py-3">
        <button
          className="w-full flex items-center gap-3 text-left"
          onClick={() => hasDetails && setOpen(v => !v)}
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt={displayName}
              className="w-12 h-12 rounded object-cover flex-shrink-0 bg-zinc-800"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-xs text-zinc-500">{muscleLabel} · {equipmentLabel} · {exercise.mechanic}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {exercise.is_custom && (
              <Badge variant="outline" className="text-xs">{customLabel}</Badge>
            )}
            {hasDetails && (
              open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </div>
        </button>

        {open && (
          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
            {exercise.image_urls && exercise.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {exercise.image_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${displayName} ${i + 1}`}
                    className="w-28 h-28 rounded object-cover flex-shrink-0 bg-zinc-800"
                  />
                ))}
              </div>
            )}
            {instructions && (
              <p className="text-sm text-zinc-400 leading-relaxed">{instructions}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
