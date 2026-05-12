'use client'

import { useTranslations } from 'next-intl'
import type { PRResult } from '@/lib/types/models'

export function PRBadge({ pr }: { pr: PRResult }) {
  const t = useTranslations('workout')
  if (!pr.is_pr) return null
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-black bg-amber-500 text-black animate-in zoom-in-75 duration-300">
      {pr.previous_1rm
        ? t('prImproved', { pct: pr.improvement_pct?.toFixed(1) ?? '0' })
        : t('firstSet')}
    </span>
  )
}
