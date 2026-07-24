import { describe, it, expect } from 'vitest'
import { parseReactions, canonicalPair } from './activity'

describe('parseReactions', () => {
  it('passes through a valid emoji→count map', () => {
    expect(parseReactions({ '🔥': 3, '💪': 1 })).toEqual({ '🔥': 3, '💪': 1 })
  })
  it('drops non-allowed emoji and non-numeric counts', () => {
    expect(parseReactions({ '🔥': 2, '💩': 5, '👏': 'x' })).toEqual({ '🔥': 2 })
  })
  it('returns {} for null/garbage', () => {
    expect(parseReactions(null)).toEqual({})
    expect(parseReactions('nope')).toEqual({})
  })
})
describe('canonicalPair', () => {
  it('orders two ids deterministically', () => {
    expect(canonicalPair('b', 'a')).toEqual(['a', 'b'])
    expect(canonicalPair('a', 'b')).toEqual(['a', 'b'])
  })
})
