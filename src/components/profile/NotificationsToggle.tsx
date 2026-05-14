'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellOff, Check, AlertCircle } from 'lucide-react'
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
  sendTestPushAction,
} from '@/app/(app)/profile/push-actions'

interface Props {
  vapidPublicKey: string
}

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

type Status = 'unknown' | 'unsupported' | 'denied' | 'off' | 'on'

export function NotificationsToggle({ vapidPublicKey }: Props) {
  const t = useTranslations('notifications')
  const [status, setStatus] = useState<Status>('unknown')
  const [error, setError] = useState<string | null>(null)
  const [testFeedback, setTestFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    navigator.serviceWorker.getRegistration().then(async reg => {
      if (!reg) {
        setStatus('off')
        return
      }
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'on' : 'off')
    })
  }, [])

  async function enable() {
    if (!vapidPublicKey) {
      setError(t('errorNoKey'))
      return
    }
    setError(null)
    setTestFeedback(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
      })

      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) {
        throw new Error('Push subscription is missing required keys')
      }

      startTransition(async () => {
        await subscribeToPushAction({
          endpoint: sub.endpoint,
          p256dh: bufferToBase64Url(p256dh),
          auth: bufferToBase64Url(auth),
          userAgent: navigator.userAgent,
        })
        setStatus('on')
      })
    } catch (e) {
      console.error('[push] subscribe failed:', e)
      setError(t('errorEnable'))
    }
  }

  async function disable() {
    setError(null)
    setTestFeedback(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        startTransition(async () => {
          await unsubscribeFromPushAction(endpoint)
          setStatus('off')
        })
      } else {
        setStatus('off')
      }
    } catch (e) {
      console.error('[push] unsubscribe failed:', e)
      setError(t('errorDisable'))
    }
  }

  async function sendTest() {
    setError(null)
    setTestFeedback(null)
    startTransition(async () => {
      try {
        const result = await sendTestPushAction()
        if (result.sent > 0) {
          setTestFeedback(t('testSent', { n: result.sent }))
        } else {
          setTestFeedback(t('testNoSubs'))
        }
        setTimeout(() => setTestFeedback(null), 4000)
      } catch (e) {
        console.error('[push] test send failed:', e)
        setError(t('errorTest'))
      }
    })
  }

  if (status === 'unknown') return null

  const Icon = status === 'on' ? Bell : BellOff

  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${status === 'on' ? 'text-amber-500' : 'text-zinc-500'}`} />
          <div>
            <div className="text-sm font-bold">{t('title')}</div>
            <div className="text-[11px] text-zinc-500">
              {status === 'on' ? t('subOn') : t('subOff')}
            </div>
          </div>
        </div>

        {status === 'unsupported' ? (
          <span className="text-[10px] text-zinc-500">{t('unsupported')}</span>
        ) : status === 'denied' ? (
          <span className="text-[10px] text-red-400">{t('denied')}</span>
        ) : status === 'on' ? (
          <button
            onClick={disable}
            disabled={isPending}
            className="h-8 px-3 rounded-lg text-xs text-zinc-300 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {t('disable')}
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={isPending}
            className="h-8 px-3 rounded-lg text-xs font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {t('enable')}
          </button>
        )}
      </div>

      {status === 'on' && (
        <button
          onClick={sendTest}
          disabled={isPending}
          className="w-full h-8 rounded-lg text-[11px] text-zinc-400 bg-white/3 hover:bg-white/8 border border-white/8 transition-colors disabled:opacity-50"
        >
          {t('sendTest')}
        </button>
      )}

      {testFeedback && (
        <div className="flex items-center gap-2 text-[11px] text-green-400">
          <Check className="h-3.5 w-3.5" />
          {testFeedback}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {status === 'denied' && (
        <p className="text-[10px] text-zinc-500 leading-relaxed">{t('deniedHint')}</p>
      )}
    </div>
  )
}
