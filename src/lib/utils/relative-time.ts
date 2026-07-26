import type { AppLocale } from '@/i18n/config'

const FORMATTERS: Record<AppLocale, Intl.RelativeTimeFormat> = {
  ru: new Intl.RelativeTimeFormat('ru', { numeric: 'auto', style: 'short' }),
  en: new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' }),
}

export function formatRelativeTime(createdAt: string, locale: AppLocale, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000))
  const formatter = FORMATTERS[locale]

  if (minutes < 1) return formatter.format(0, 'second')
  if (minutes < 60) return formatter.format(-minutes, 'minute')
  if (minutes < 1440) return formatter.format(-Math.floor(minutes / 60), 'hour')
  return formatter.format(-Math.floor(minutes / 1440), 'day')
}
