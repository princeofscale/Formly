'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Wind, X } from 'lucide-react'

interface Props {
  weekIndex: number
  cycleWeeks: number
}

export function DeloadBanner({ weekIndex, cycleWeeks }: Props) {
  const t = useTranslations('dashboard.deload')
  const [hidden, setHidden] = useState(true)

  const storageKey = `deload_dismissed_w${weekIndex}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHidden(window.localStorage.getItem(storageKey) === '1')
  }, [storageKey])

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1')
    }
    setHidden(true)
  }

  if (hidden) return null

  return (
    <div
      className="relative rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(34, 211, 168, 0.12), rgba(56, 189, 248, 0.08))',
        border: '1px solid rgba(34, 211, 168, 0.25)',
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        aria-label={t('dismiss')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(34, 211, 168, 0.18)' }}
        >
          <Wind className="h-4 w-4" style={{ color: '#5EEAD4' }} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#5EEAD4' }}>
            {t('label', { cycle: cycleWeeks })}
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {t('title')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            {t('body')}
          </p>
        </div>
      </div>
    </div>
  )
}
