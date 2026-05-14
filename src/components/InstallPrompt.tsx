'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'gymlog_install_dismissed'

function isIosSafariStandalone(): boolean {
  if (typeof window === 'undefined') return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (isIosSafariStandalone()) return true
  return false
}

export function InstallPrompt() {
  const t = useTranslations('install')
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isAlreadyInstalled()) return
    if (localStorage.getItem(DISMISS_KEY) === 'true') return

    if (isIos()) {
      // iOS Safari doesn't fire beforeinstallprompt — show manual hint after delay
      const timer = setTimeout(() => {
        setShowIosHint(true)
        setHidden(false)
      }, 4000)
      return () => clearTimeout(timer)
    }

    function handler(event: Event) {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
      setHidden(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
    setHidden(true)
  }

  async function install() {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
    setHidden(true)
  }

  if (hidden) return null

  return (
    <div
      className="fixed z-40 left-4 right-4 md:left-auto md:right-4 md:w-80 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
    >
      <div
        className="p-3 rounded-2xl"
        style={{
          background: 'rgba(10, 10, 30, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            <Download className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-white">{t('title')}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
              {showIosHint ? t('iosInstructions') : t('subtitle')}
            </div>

            {showIosHint ? (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
                <Share className="h-3.5 w-3.5" />
                <span>{t('iosShareHint')}</span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={install}
                  className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                >
                  {t('cta')}
                </button>
                <button
                  onClick={dismiss}
                  className="h-8 px-3 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {t('later')}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
