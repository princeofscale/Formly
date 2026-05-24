import type { PRResult } from '@/lib/types/models'

export function detectPRFromHistory(
  currentE1rm: number,
  previousBestE1rm: number | null,
): PRResult {
  if (previousBestE1rm === null) {
    return { is_pr: true, previous_1rm: null, current_1rm: currentE1rm, improvement_pct: null }
  }

  if (currentE1rm > previousBestE1rm) {
    const improvement_pct = ((currentE1rm - previousBestE1rm) / previousBestE1rm) * 100
    return {
      is_pr: true,
      previous_1rm: previousBestE1rm,
      current_1rm: currentE1rm,
      improvement_pct,
    }
  }

  return {
    is_pr: false,
    previous_1rm: previousBestE1rm,
    current_1rm: currentE1rm,
    improvement_pct: null,
  }
}
