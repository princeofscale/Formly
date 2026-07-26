import { describe, expect, it } from 'vitest'
import {
  dateKeyInTimeZone,
  hourInTimeZone,
  isoWeekday,
  isValidTimeZone,
  validTimeZoneOrUtc,
} from './time-zone'

describe('time-zone helpers', () => {
  it('uses the athlete local calendar day and hour', () => {
    const instant = new Date('2026-07-26T21:30:00Z')
    expect(dateKeyInTimeZone(instant, 'Europe/Saratov')).toBe('2026-07-27')
    expect(hourInTimeZone(instant, 'Europe/Saratov')).toBe(1)
  })

  it('validates zones and ISO weekdays', () => {
    expect(isValidTimeZone('Europe/Saratov')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(validTimeZoneOrUtc('Mars/Olympus')).toBe('UTC')
    expect(isoWeekday('2026-07-27')).toBe(1)
  })
})
