'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STORAGE_KEY = 'gymlog_rest_duration'

interface Props {
  /** Default rest duration in seconds (overridden by user's saved preference) */
  seconds: number
  onDone: () => void
}

const PRESETS: { label: string; value: number }[] = [
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '3:00', value: 180 },
  { label: '5:00', value: 300 },
]

function getInitialDuration(fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const n = saved ? parseInt(saved, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Short two-tone beep via WebAudio — no asset, ~100ms total.
function playBeep() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const now = ctx.currentTime
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur)
    }
    tone(880, 0, 0.18)
    tone(1320, 0.18, 0.22)
    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch {
    // Audio blocked or unsupported — silent fallback.
  }
}

function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: 'rest-timer', icon: '/icon-192.png' })
  } catch {
    // Some browsers require ServiceWorker.showNotification for installed PWAs.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg
          ?.showNotification(title, { body, tag: 'rest-timer', icon: '/icon-192.png' })
          .catch(() => {})
      })
    }
  }
}

interface WakeLockSentinelLite {
  release: () => Promise<void>
}
interface WakeLockApi {
  request: (type: 'screen') => Promise<WakeLockSentinelLite>
}

function sendSwMessage(msg: Record<string, unknown>) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
  navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage(msg)).catch(() => {})
}

export function RestTimer({ seconds, onDone }: Props) {
  const t = useTranslations('workout')
  const tRT = useTranslations('workout.restTimer')
  const [duration, setDuration] = useState(() => getInitialDuration(seconds))
  // Absolute end timestamp — single source of truth. Wall-clock based so
  // background-tab throttling / phone-screen-off can't desync the display.
  const [endsAt, setEndsAt] = useState<number>(
    () => Date.now() + getInitialDuration(seconds) * 1000,
  )
  const [remaining, setRemaining] = useState<number>(() => getInitialDuration(seconds))
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
  )
  const doneRef = useRef(false)
  const wakeLockRef = useRef<WakeLockSentinelLite | null>(null)
  const swScheduledRef = useRef<number>(0) // endsAt we last sent to SW

  // Persist preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, String(duration))
  }, [duration])

  // Acquire wake lock for the lifetime of the timer (best-effort).
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: WakeLockApi }
    if (!nav.wakeLock) return
    let cancelled = false
    const acquire = () => {
      nav
        .wakeLock!.request('screen')
        .then((sentinel) => {
          if (cancelled) {
            sentinel.release().catch(() => {})
            return
          }
          wakeLockRef.current = sentinel
        })
        .catch(() => {})
    }
    acquire()
    // Re-acquire when tab becomes visible again (browsers release wake lock on hide)
    const onVis = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  // Schedule SW notification once per endsAt — fires reliably even if the tab
  // is backgrounded or the phone screen is off.
  useEffect(() => {
    if (swScheduledRef.current === endsAt) return
    swScheduledRef.current = endsAt
    sendSwMessage({
      type: 'rest-timer-start',
      endsAt,
      title: tRT('notifTitle'),
      body: tRT('notifBody'),
    })
  }, [endsAt, tRT])

  // Tick: recompute from wall clock every second. Immune to throttling because
  // it never assumes "1s elapsed" — it asks Date.now() each tick. Also catches
  // up instantly when the user re-foregrounds the tab.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) {
        if (!doneRef.current) {
          doneRef.current = true
          navigator.vibrate?.([200, 100, 200])
          playBeep()
          fireNotification(tRT('notifTitle'), tRT('notifBody'))
        }
        onDone()
        return
      }
      // Align to next wall-clock second so display feels crisp
      const drift = (endsAt - Date.now()) % 1000
      id = setTimeout(tick, drift > 0 ? drift : 1000)
    }
    tick()

    // Force a recompute the moment the user re-foregrounds the tab
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (id !== null) clearTimeout(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [endsAt, onDone, tRT])

  const applyPreset = useCallback((value: number) => {
    setDuration(value)
    setEndsAt(Date.now() + value * 1000)
    doneRef.current = false
  }, [])

  async function requestNotifPermission() {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setNotifPermission(p)
  }

  const pct = duration > 0 ? remaining / duration : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const stroke = remaining > 45 ? '#22c55e' : remaining > 20 ? '#eab308' : '#ef4444'
  const textColor =
    remaining > 45 ? 'text-green-400' : remaining > 20 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-2 py-1 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#27272a" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              fill="none"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center font-mono font-black text-sm tabular-nums ${textColor}`}
          >
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400">{t('resting')}</p>
          {notifPermission === 'default' && (
            <button
              type="button"
              onClick={requestNotifPermission}
              className="mt-0.5 text-[10px] underline decoration-dotted underline-offset-2 text-amber-400/80 hover:text-amber-300"
            >
              {tRT('enableNotif')}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            sendSwMessage({ type: 'rest-timer-cancel' })
            onDone()
          }}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-1 rounded-sm hover:bg-white/10"
        >
          {t('restSkip')}
        </button>
      </div>

      <div className="flex gap-1">
        {PRESETS.map((p) => {
          const active = duration === p.value
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              className={`flex-1 h-7 rounded-md text-[10px] font-mono font-bold transition-colors ${
                active
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
