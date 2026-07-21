'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'

export function UpdateBanner() {
  const [show, setShow] = useState(false)
  const t = useTranslations('updateBanner')

  useEffect(() => {
    function onUpdate() {
      setShow(true)
    }
    window.addEventListener('formly:sw-update', onUpdate)
    return () => window.removeEventListener('formly:sw-update', onUpdate)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg ring-1 ring-amber-300/60">
      <RefreshCw className="h-4 w-4" />
      <span>{t('available')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-wider transition hover:bg-black/30"
      >
        {t('reload')}
      </button>
    </div>
  )
}
