import { describe, it, expect } from 'vitest'
import { calculateStreak } from './streak.service'

describe('calculateStreak', () => {
  it('returns zero streak for empty workout history', () => {
    const result = calculateStreak([], [1, 3, 5], new Date('2026-05-13T12:00:00Z'))
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
    expect(result.last_workout_date).toBeNull()
  })

  it('counts consecutive scheduled workout days', () => {
    // Schedule: Mon/Wed/Fri = [1, 3, 5]
    // 2026-05-13 = Wednesday
    // Workouts: Mon 11, Wed 13 (today)
    const result = calculateStreak(
      ['2026-05-13', '2026-05-11'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.current).toBe(2)
    expect(result.last_workout_date).toBe('2026-05-13')
  })

  it('ignores rest days when counting streak', () => {
    // Schedule: Mon/Wed/Fri. Tuesday workout doesn't count, today (Wed) not done yet
    const result = calculateStreak(
      ['2026-05-12', '2026-05-11'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    // Mon completed; Wed is today and not done — skip; current = 1 (Mon)
    expect(result.current).toBe(1)
  })

  it('breaks streak when a scheduled day was missed', () => {
    // Schedule: Mon/Wed/Fri. Today Mon 11 with workout. Walk back: Mon 11 ✓, Fri 08 missing → break.
    const result = calculateStreak(
      ['2026-05-11', '2026-05-04', '2026-05-01'],
      [1, 3, 5],
      new Date('2026-05-11T12:00:00Z')
    )
    expect(result.current).toBe(1)
  })

  it('treats today as allowed even if scheduled and no workout', () => {
    // Today is Mon 11 (scheduled), no workout yet. Walk back: Mon 11 skip; Fri 08 ✓; Wed 06 ✓; Mon 04 ✓
    const result = calculateStreak(
      ['2026-05-08', '2026-05-06', '2026-05-04'],
      [1, 3, 5],
      new Date('2026-05-11T08:00:00Z')
    )
    expect(result.current).toBe(3)
  })

  it('computes longest streak from history', () => {
    // Workouts: Apr 22 (Wed), Apr 24 (Fri), Apr 27 (Mon), Apr 29 (Wed). 4 in a row.
    // Then May 11 (Mon), May 13 (Wed). 2 in a row.
    const result = calculateStreak(
      ['2026-05-13', '2026-05-11', '2026-04-29', '2026-04-27', '2026-04-24', '2026-04-22'],
      [1, 3, 5],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.longest).toBe(4)
    expect(result.current).toBe(2)
  })

  it('falls back to consecutive calendar days when no schedule', () => {
    const result = calculateStreak(
      ['2026-05-13', '2026-05-12', '2026-05-11', '2026-05-09'],
      [],
      new Date('2026-05-13T12:00:00Z')
    )
    expect(result.current).toBe(0)
    expect(result.longest).toBe(3)
  })
})
