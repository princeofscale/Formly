import { describe, it, expect } from 'vitest'
import { crossedMilestone } from './activity-milestones'

describe('crossedMilestone', () => {
  it('emits 7 when reaching a 7-day streak fresh', () => {
    expect(crossedMilestone(7, 0)).toEqual({ milestone: 7, resetTo: null })
  })
  it('does not re-emit while plateaued above a milestone', () => {
    expect(crossedMilestone(9, 7)).toEqual({ milestone: null, resetTo: null })
  })
  it('emits the highest crossed milestone when jumping past several', () => {
    expect(crossedMilestone(30, 7)).toEqual({ milestone: 30, resetTo: null })
  })
  it('resets when the streak breaks below 7', () => {
    expect(crossedMilestone(3, 30)).toEqual({ milestone: null, resetTo: 0 })
  })
  it('re-earns 7 after a reset', () => {
    expect(crossedMilestone(7, 0)).toEqual({ milestone: 7, resetTo: null })
  })
  it('no milestone and no reset below 7 with nothing emitted', () => {
    expect(crossedMilestone(3, 0)).toEqual({ milestone: null, resetTo: null })
  })
})
