import { describe, it, expect } from 'vitest'
import { buildPRPushBody } from './pr-notifications.service'

describe('buildPRPushBody', () => {
  it('formats a record without percent when there is no previous best', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Жим лёжа',
      weightKg: 100,
      reps: 5,
      improvementPct: null,
    })
    expect(body).toBe('Жим лёжа — новый рекорд: 100кг × 5')
  })

  it('formats an improvement with percent gain', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Приседания',
      weightKg: 140,
      reps: 3,
      improvementPct: 4.32,
    })
    expect(body).toBe('Приседания — 140кг × 3 (+4.3%)')
  })

  it('drops trailing zeros for integer weights', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Тяга',
      weightKg: 180,
      reps: 1,
      improvementPct: 0.5,
    })
    expect(body).toBe('Тяга — 180кг × 1 (+0.5%)')
  })
})
