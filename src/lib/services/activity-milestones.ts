export const MILESTONES = [7, 14, 30, 60, 100, 200, 365] as const

export function crossedMilestone(
  current: number,
  lastEmitted: number,
): { milestone: number | null; resetTo: number | null } {
  if (current < MILESTONES[0]) {
    return { milestone: null, resetTo: lastEmitted > 0 ? 0 : null }
  }
  let highest: number | null = null
  for (const m of MILESTONES) {
    if (m <= current && m > lastEmitted) highest = m
  }
  return { milestone: highest, resetTo: null }
}
