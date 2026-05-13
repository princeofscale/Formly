'use client'

import { useTranslations } from 'next-intl'
import type { PRResult } from '@/lib/types/models'

export function PRBadge({ pr }: { pr: PRResult }) {
  const t = useTranslations('workout')
  if (!pr.is_pr) return null
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black animate-in zoom-in-75 duration-300"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#000', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}
    >
      {pr.previous_1rm
        ? t('prImproved', { pct: pr.improvement_pct?.toFixed(1) ?? '0' })
        : t('firstSet')}
    </span>
  )
}
