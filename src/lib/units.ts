export function weightUnit(locale: string): string {
  return locale === 'ru' ? 'кг' : 'kg'
}

export function lengthUnit(locale: string): string {
  return locale === 'ru' ? 'см' : 'cm'
}

export function formatWeight(value: number, locale: string, maximumFractionDigits = 1): string {
  return `${new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits,
  }).format(value)} ${weightUnit(locale)}`
}
