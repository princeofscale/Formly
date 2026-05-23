import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateWeightKg,
  validateReps,
  validateRpe,
  validateSetNumber,
  validateUuid,
} from './validators'

describe('validators', () => {
  describe('validateWeightKg', () => {
    it('accepts 0, fractional, and high-but-realistic loads', () => {
      expect(validateWeightKg(0)).toBe(0)
      expect(validateWeightKg(102.5)).toBe(102.5)
      expect(validateWeightKg(500)).toBe(500)
    })
    it('rejects negative, infinite, NaN, non-number', () => {
      expect(() => validateWeightKg(-1)).toThrow(ValidationError)
      expect(() => validateWeightKg(Infinity)).toThrow(ValidationError)
      expect(() => validateWeightKg(NaN)).toThrow(ValidationError)
      expect(() => validateWeightKg('100')).toThrow(ValidationError)
      expect(() => validateWeightKg(null)).toThrow(ValidationError)
    })
    it('rejects absurd loads above 1000kg', () => {
      expect(() => validateWeightKg(1001)).toThrow(ValidationError)
    })
  })

  describe('validateReps', () => {
    it('accepts integers 1..200', () => {
      expect(validateReps(1)).toBe(1)
      expect(validateReps(20)).toBe(20)
      expect(validateReps(200)).toBe(200)
    })
    it('rejects 0, negative, fractional, out-of-range', () => {
      expect(() => validateReps(0)).toThrow(ValidationError)
      expect(() => validateReps(-5)).toThrow(ValidationError)
      expect(() => validateReps(2.5)).toThrow(ValidationError)
      expect(() => validateReps(201)).toThrow(ValidationError)
    })
  })

  describe('validateRpe', () => {
    it('accepts undefined/null as omitted', () => {
      expect(validateRpe(undefined)).toBeUndefined()
      expect(validateRpe(null)).toBeUndefined()
    })
    it('accepts 1..10 including half-steps', () => {
      expect(validateRpe(1)).toBe(1)
      expect(validateRpe(7.5)).toBe(7.5)
      expect(validateRpe(10)).toBe(10)
    })
    it('rejects out of range', () => {
      expect(() => validateRpe(0)).toThrow(ValidationError)
      expect(() => validateRpe(11)).toThrow(ValidationError)
    })
  })

  describe('validateSetNumber', () => {
    it('accepts 1..99', () => {
      expect(validateSetNumber(1)).toBe(1)
      expect(validateSetNumber(99)).toBe(99)
    })
    it('rejects 0, negative, fractional, >99', () => {
      expect(() => validateSetNumber(0)).toThrow(ValidationError)
      expect(() => validateSetNumber(100)).toThrow(ValidationError)
      expect(() => validateSetNumber(1.5)).toThrow(ValidationError)
    })
  })

  describe('validateUuid', () => {
    it('accepts canonical UUIDs', () => {
      const u = '550e8400-e29b-41d4-a716-446655440000'
      expect(validateUuid(u, 'x')).toBe(u)
    })
    it('rejects non-UUIDs', () => {
      expect(() => validateUuid('not-a-uuid', 'x')).toThrow(ValidationError)
      expect(() => validateUuid('', 'x')).toThrow(ValidationError)
      expect(() => validateUuid(null, 'x')).toThrow(ValidationError)
      expect(() => validateUuid(123, 'x')).toThrow(ValidationError)
    })
  })
})
