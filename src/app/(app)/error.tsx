'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * Shown when a read fails rather than returning nothing.
 *
 * Database reads used to swallow their errors and hand back an empty array, so
 * an outage arrived as "you have no workouts" — wrong, and alarming in exactly
 * the way a training log must never be. They now raise, which is only an
 * improvement if the raise lands somewhere designed. This is that place.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // The per-feature message files are spread into one flat namespace, so this
  // is `error`, not `common.error`.
  const t = useTranslations('error')

  useEffect(() => {
    console.error('[app] render failed:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-lg font-black tracking-tight text-white">{t('title')}</h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/55">{t('body')}</p>
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition hover:brightness-110"
      >
        <RotateCw className="h-3.5 w-3.5" />
        {t('retry')}
      </button>

      {/* The digest is what ties this screen to a line in the server log. */}
      {error.digest && <p className="font-mono text-[10px] text-white/25">{error.digest}</p>}
    </div>
  )
}
