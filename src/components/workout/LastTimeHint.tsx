'use client'

import { useTranslations } from 'next-intl'
import type { SetEntry } from '@/lib/types/models'

export function LastTimeHint({ sets }: { sets: SetEntry[] }) {
  const t = useTranslations('workout')
  if (sets.length === 0) return null

  // DB returns newest-first; reverse for chronological display
  const sorted = [...sets].reverse()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
        {t('lastTime')}:
      </span>
      {sorted.map((set, i) => (
        <span key={i} className="text-[11px] font-mono text-zinc-500">
          {set.weight_kg}<span className="text-zinc-700 text-[9px]">кг</span>
          <span className="text-zinc-700">×</span>
          {set.reps}
        </span>
      ))}
    </div>
  )
}
