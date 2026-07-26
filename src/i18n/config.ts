import { hasLocale } from 'next-intl'

export const locales = ['ru', 'en'] as const
export const defaultLocale = 'ru'

export type AppLocale = (typeof locales)[number]

export function resolveLocale(value: string | undefined): AppLocale {
  return hasLocale(locales, value) ? value : defaultLocale
}
