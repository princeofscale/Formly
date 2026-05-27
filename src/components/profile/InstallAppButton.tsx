'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ChevronRight, Download, Share2, Plus, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac — also detect via touch points
  const isIPadOS =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  return isAppleDevice || isIPadOS
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function InstallAppButton() {
  const t = useTranslations('profile.install')
  const [installed, setInstalled] = useState<boolean>(() => detectStandalone())
  const [isIOS] = useState<boolean>(() => detectIOS())
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed) return null
  if (!deferred && !isIOS) return null

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setDeferred(null)
      return
    }
    if (isIOS) setShowIOSModal(true)
  }

  return (
    <>
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
              {isIOS && !deferred ? t('subtitleIOS') : t('subtitle')}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-white/40" />
      </button>
      {showIOSModal && typeof document !== 'undefined'
        ? createPortal(<IOSInstructions onClose={() => setShowIOSModal(false)} />, document.body)
        : null}
    </>
  )
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  const t = useTranslations('profile.install')
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      style={{ background: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[20px] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        style={{
          background: '#15151C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          maxHeight: 'calc(100dvh - 24px)',
        }}
      >
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-base font-bold text-white">{t('iosTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5">
          <p
            className="text-zinc-400 text-sm mb-4"
            style={{ font: '500 13px/1.5 var(--tar-text)' }}
          >
            {t('iosIntro')}
          </p>
          <ol className="space-y-3">
            <Step n={1} icon={null}>
              {t('iosStep1')}
            </Step>
            <Step n={2} icon={<Share2 className="h-4 w-4" style={{ color: '#6FA6FF' }} />}>
              {t('iosStep2')}
            </Step>
            <Step n={3} icon={<Plus className="h-4 w-4" style={{ color: 'var(--tar-brand-2)' }} />}>
              {t('iosStep3')}
            </Step>
            <Step n={4} icon={null}>
              {t('iosStep4')}
            </Step>
          </ol>
        </div>
        <div
          className="p-5 pt-3"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: '#15151C',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-[8px] text-sm font-bold text-white"
            style={{ background: '#FF3B47' }}
          >
            {t('iosCta')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({
  n,
  icon,
  children,
}: {
  n: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 tabular-nums"
        style={{
          background: 'rgba(255, 182, 39, 0.12)',
          border: '1px solid rgba(255, 182, 39, 0.3)',
          color: 'var(--tar-brand-2)',
          font: '800 12px/1 var(--tar-mono)',
        }}
      >
        {n}
      </div>
      <div
        className="flex-1 pt-0.5 flex items-center gap-2"
        style={{ font: '500 13px/1.45 var(--tar-text)', color: 'var(--tar-ink)' }}
      >
        <span>{children}</span>
        {icon}
      </div>
    </li>
  )
}
