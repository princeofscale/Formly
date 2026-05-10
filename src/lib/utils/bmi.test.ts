import { describe, it, expect } from 'vitest'
import { calculateBMI, bmiCategory } from './bmi'

describe('calculateBMI', () => {
  it('returns correct BMI for known values (70kg, 175cm ≈ 22.86)', () => {
    expect(calculateBMI(70, 175)).toBeCloseTo(22.86, 1)
  })

  it('throws for zero height', () => {
    expect(() => calculateBMI(70, 0)).toThrow('Height and weight must be positive')
  })

  it('throws for negative height', () => {
    expect(() => calculateBMI(70, -175)).toThrow('Height and weight must be positive')
  })

  it('throws for zero weight', () => {
    expect(() => calculateBMI(0, 175)).toThrow('Height and weight must be positive')
  })

  it('throws for negative weight', () => {
    expect(() => calculateBMI(-70, 175)).toThrow('Height and weight must be positive')
  })
})

describe('bmiCategory', () => {
  it('returns Underweight for BMI < 18.5', () => {
    expect(bmiCategory(17)).toBe('Underweight')
    expect(bmiCategory(18.4)).toBe('Underweight')
  })

  it('returns Normal for BMI >= 18.5 and < 25', () => {
    expect(bmiCategory(18.5)).toBe('Normal')
    expect(bmiCategory(22)).toBe('Normal')
    expect(bmiCategory(24.9)).toBe('Normal')
  })

  it('returns Overweight for BMI >= 25 and < 30', () => {
    expect(bmiCategory(25)).toBe('Overweight')
    expect(bmiCategory(27)).toBe('Overweight')
    expect(bmiCategory(29.9)).toBe('Overweight')
  })

  it('returns Obese for BMI >= 30', () => {
    expect(bmiCategory(30)).toBe('Obese')
    expect(bmiCategory(40)).toBe('Obese')
  })
})
