import { describe, it, expect } from 'vitest'
import { getVolumeLandmarks } from './analytics.service'
import type { MuscleVolume } from '@/lib/types/models'

function mv(muscle: MuscleVolume['muscle'], sets: number): MuscleVolume {
  return { muscle, direct_sets: sets, indirect_sets: 0, total_sets: sets }
}

describe('getVolumeLandmarks', () => {
  it('judges a muscle on its regions combined, not on each one alone', () => {
    const [chest] = getVolumeLandmarks([mv('chest_upper', 6), mv('chest', 8), mv('chest_lower', 4)])

    // 6, 8 and 4 sets are each under the minimum on their own; eighteen sets of
    // chest in a week is not an under-trained chest.
    expect(chest.muscle).toBe('chest')
    expect(chest.weekly_sets).toBe(18)
    expect(chest.status).toBe('optimal')
  })

  it('lists the regions behind the verdict, heaviest first', () => {
    const [chest] = getVolumeLandmarks([mv('chest_upper', 6), mv('chest', 8)])

    expect(chest.regions).toEqual([
      { muscle: 'chest', weekly_sets: 8 },
      { muscle: 'chest_upper', weekly_sets: 6 },
    ])
  })

  it('leaves a muscle with no regions unsplit', () => {
    const [biceps] = getVolumeLandmarks([mv('biceps', 10)])

    expect(biceps.regions).toBeUndefined()
    expect(biceps.status).toBe('optimal')
  })

  it('still flags a group sitting at its recoverable ceiling', () => {
    const [chest] = getVolumeLandmarks([mv('chest', 20), mv('chest_upper', 6)])

    expect(chest.weekly_sets).toBe(26)
    expect(chest.status).toBe('mrv')
  })
})
