import type { PRResult } from '@/lib/types/models'

export function PRBadge({ pr }: { pr: PRResult }) {
  if (!pr.is_pr) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-500 text-black">
      {pr.previous_1rm ? `PR +${pr.improvement_pct?.toFixed(1)}%` : '🏆 First set!'}
    </span>
  )
}
