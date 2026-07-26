export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function validTimeZoneOrUtc(value: string): string {
  return isValidTimeZone(value) ? value : 'UTC'
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function hourInTimeZone(date: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  )
}

export function isoWeekday(dateKey: string): number {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
