import type { PRResult } from '@/lib/types/models'

/**
 * A PR is beating your own previous best working weight. The very first
 * result for an exercise sets the baseline and is deliberately not
 * celebrated — the app avoids noise messages like "first set!".
 */
export function detectPRFromHistory(currentBest: number, previousBest: number | null): PRResult {
  if (previousBest === null) {
    return { is_pr: false, previous_best: null, current_best: currentBest, improvement_pct: null }
  }

  if (currentBest > previousBest) {
    const improvement_pct = ((currentBest - previousBest) / previousBest) * 100
    return {
      is_pr: true,
      previous_best: previousBest,
      current_best: currentBest,
      improvement_pct,
    }
  }

  return {
    is_pr: false,
    previous_best: previousBest,
    current_best: currentBest,
    improvement_pct: null,
  }
}
