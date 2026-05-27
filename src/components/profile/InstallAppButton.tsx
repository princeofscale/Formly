'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, Download } from 'lucide-react'

const DISMISS_KEY = 'gymlog_install_dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function InstallAppButton() {
  const t = useTranslations('profile.install')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe client bootstrap
      setShow(true)
    }
  }, [])

  if (!show) return null

  function handleClick() {
    try {
      localStorage.removeItem(DISMISS_KEY)
    } catch {
      // localStorage unavailable (private mode) — banner will still re-show
    }
    window.location.reload()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="tar-pl-qbtn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ico" style={{ marginBottom: 0, color: 'var(--tar-brand-2)' }}>
          <Download />
        </div>
        <div>
          <div className="t">{t('title')}</div>
          <div className="s" style={{ marginTop: 4 }}>
            {t('subtitle')}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-white/40" />
    </button>
  )
}
