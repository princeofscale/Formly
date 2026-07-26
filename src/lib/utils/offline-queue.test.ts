import { describe, expect, it } from 'vitest'
import { isRecordForOwner } from './offline-queue'

describe('isRecordForOwner', () => {
  it('keeps legacy records drainable without exposing another known owner', () => {
    expect(isRecordForOwner({}, 'current-user')).toBe(true)
    expect(isRecordForOwner({ ownerId: 'current-user' }, 'current-user')).toBe(true)
    expect(isRecordForOwner({ ownerId: 'other-user' }, 'current-user')).toBe(false)
  })
})
