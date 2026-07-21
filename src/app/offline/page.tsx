'use client'

// Offline fallback page. Precached by the service worker at install time and
// served for failed navigations (see public/sw.js). No auth on purpose: it
// must render from cache without any server roundtrip.

import { useTranslations } from 'next-intl'
import { CloudOff } from 'lucide-react'

export default function OfflinePage() {
  const t = useTranslations('offline')
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        background: 'var(--tar-bg, #0a0a0f)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--tar-line, rgba(255,255,255,0.08))',
          marginBottom: 18,
        }}
      >
        <CloudOff style={{ width: 28, height: 28, color: 'var(--tar-ink-dim, #a0a0b0)' }} />
      </div>
      <h1
        style={{
          font: '800 22px/1.2 var(--tar-display, inherit)',
          color: 'var(--tar-ink, #fff)',
          marginBottom: 10,
        }}
      >
        {t('pageTitle')}
      </h1>
      <p
        style={{
          font: '500 14px/1.5 var(--tar-text, inherit)',
          color: 'var(--tar-ink-dim, #a0a0b0)',
          maxWidth: 340,
          marginBottom: 24,
        }}
      >
        {t('pageSub')}
      </p>
      <button type="button" className="tar-cta" onClick={() => window.location.reload()}>
        {t('retry')}
      </button>
    </div>
  )
}
