import { describe, expect, it } from 'vitest'
import { classifySyncStatus } from './offline-sync'

describe('classifySyncStatus', () => {
  it.each([
    [200, 'success'],
    [400, 'dead-letter'],
    [422, 'dead-letter'],
    [401, 'auth'],
    [500, 'retry'],
    [503, 'retry'],
  ] as const)('classifies HTTP %s as %s', (status, expected) => {
    expect(classifySyncStatus(status)).toBe(expected)
  })
})
