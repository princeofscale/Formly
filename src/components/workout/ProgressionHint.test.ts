import { describe, expect, it } from 'vitest'
import { formatDelta } from './ProgressionHint'

describe('formatDelta', () => {
  it.each([
    [2, '2'],
    [0.25, '0.25'],
    [-0.75, '0.75'],
    [2.25, '2.25'],
    [2.5, '2.5'],
  ])('formats %s kg as %s without losing quarter steps', (delta, expected) => {
    expect(formatDelta(delta)).toBe(expected)
  })
})
