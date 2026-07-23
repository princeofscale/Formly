'use client'
import { useOptimistic, useTransition } from 'react'
import { REACTION_EMOJI } from '@/lib/db/activity'
import { reactAction } from '@/app/(app)/friends/activity-actions'

interface Props {
  eventId: string
  counts: Record<string, number>
  mine: string[]
}

export function ReactionRow({ eventId, counts, mine }: Props) {
  const [, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic({ counts, mine }, (state, emoji: string) => {
    const has = state.mine.includes(emoji)
    const nextCounts = { ...state.counts, [emoji]: (state.counts[emoji] ?? 0) + (has ? -1 : 1) }
    if (nextCounts[emoji] <= 0) delete nextCounts[emoji]
    return {
      counts: nextCounts,
      mine: has ? state.mine.filter((e) => e !== emoji) : [...state.mine, emoji],
    }
  })

  function toggle(emoji: string) {
    const fd = new FormData()
    fd.set('eventId', eventId)
    fd.set('emoji', emoji)
    startTransition(async () => {
      setOptimistic(emoji)
      await reactAction(fd)
    })
  }

  return (
    <div className="tar-fr-reactions">
      {REACTION_EMOJI.map((emoji) => {
        const c = optimistic.counts[emoji] ?? 0
        const on = optimistic.mine.includes(emoji)
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            className={`tar-fr-emoji${on ? ' on' : ''}`}
            aria-pressed={on}
          >
            <span aria-hidden>{emoji}</span>
            {c > 0 && <b className="tabular-nums">{c}</b>}
          </button>
        )
      })}
    </div>
  )
}
