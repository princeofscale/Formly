import { describe, it, expect } from 'vitest'
import { buildPRPushBody } from './pr-notifications.service'

describe('buildPRPushBody', () => {
  it('formats a first-ever record (no previous best)', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Жим лёжа',
      weightKg: 100,
      reps: 5,
      e1rm: 112.5,
      improvementPct: null,
    })
    expect(body).toBe('Жим лёжа — первый рекорд: 100кг × 5, e1ПМ 112.5кг')
  })

  it('formats an improvement with percent gain', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Приседания',
      weightKg: 140,
      reps: 3,
      e1rm: 152.6,
      improvementPct: 4.32,
    })
    expect(body).toBe('Приседания — 140кг × 3, e1ПМ 152.6кг (+4.3%)')
  })

  it('drops trailing zeros for integer weights', () => {
    const body = buildPRPushBody({
      userId: 'u',
      exerciseName: 'Тяга',
      weightKg: 180,
      reps: 1,
      e1rm: 180,
      improvementPct: 0.5,
    })
    expect(body).toBe('Тяга — 180кг × 1, e1ПМ 180кг (+0.5%)')
  })
})
