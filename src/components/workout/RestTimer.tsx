'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'

const RADIUS = 44
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
  // Hydration-safe initial values. Real wall-clock endsAt is set on mount
  // in an effect below to avoid server/client Date.now() drift.
  const [duration, setDuration] = useState(() =>
    typeof window === 'undefined' ? seconds : getInitialDuration(seconds),
  )
  const [endsAt, setEndsAt] = useState<number>(0)
  const [remaining, setRemaining] = useState<number>(() =>
    typeof window === 'undefined' ? seconds : getInitialDuration(seconds),
  )
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
  )
  const doneRef = useRef(false)
  const wakeLockRef = useRef<WakeLockSentinelLite | null>(null)
  const swScheduledRef = useRef<number>(0) // endsAt we last sent to SW

  // Mount: set real endsAt on client. Server-renders with 0 to avoid
  // Date.now() drift causing hydration mismatch (React error #418).
  useEffect(() => {
    if (endsAt !== 0) return
    const d = getInitialDuration(seconds)
    /* eslint-disable react-hooks/set-state-in-effect -- hydration-safe client bootstrap */
    setDuration(d)
    setEndsAt(Date.now() + d * 1000)
    setRemaining(d)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [endsAt, seconds])

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
    if (endsAt === 0) return // not yet initialised on client
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
    if (endsAt === 0) return // not yet initialised on client
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

  function adjust(deltaSec: number) {
    setEndsAt((prev) => prev + deltaSec * 1000)
    doneRef.current = false
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setNotifPermission(p)
  }

  const pct = duration > 0 ? remaining / duration : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const ringState =
    remaining === 0 ? 'done' : remaining <= 5 ? 'urgent' : remaining <= 15 ? 'warn' : ''
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const timeLabel = remaining === 0 ? 'GO' : `${mm}:${String(ss).padStart(2, '0')}`

  return (
    <div
      className="animate-in fade-in duration-300"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--tar-w-line)',
        borderRadius: 'var(--tar-w-r-lg)',
        padding: '14px 16px 12px',
      }}
    >
      <div className="tar-w-sheet-eyebrow" style={{ marginBottom: 8 }}>
        {t('resting')}
      </div>

      <div
        className={`tar-w-ring ${ringState}`}
        style={{ width: 110, height: 110, margin: '0 auto 12px' }}
      >
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="tar-w-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#FFB627" />
            </linearGradient>
          </defs>
          <circle className="track" cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="6" />
          <circle
            className="progress"
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="tar-w-ring-inner">
          <div className="tar-w-ring-num" style={{ fontSize: 32 }}>
            {timeLabel}
          </div>
        </div>
      </div>

      <div className="tar-w-ring-actions">
        <button type="button" className="tar-w-ring-action" onClick={() => adjust(-15)}>
          −15с
        </button>
        <button
          type="button"
          className="tar-w-ring-action skip"
          onClick={() => {
            sendSwMessage({ type: 'rest-timer-cancel' })
            onDone()
          }}
        >
          {t('restSkip')}
        </button>
        <button type="button" className="tar-w-ring-action" onClick={() => adjust(15)}>
          +15с
        </button>
      </div>

      {notifPermission === 'default' && (
        <button
          type="button"
          onClick={requestNotifPermission}
          className="mt-2 w-full text-[10px] text-center underline decoration-dotted underline-offset-2 text-amber-400/80 hover:text-amber-300"
        >
          {tRT('enableNotif')}
        </button>
      )}

      <div className="tar-w-rpe-row" style={{ marginTop: 10 }}>
        {PRESETS.map((p) => {
          const active = duration === p.value
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              className={'tar-w-rpe-chip ' + (active ? 'on' : '')}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
