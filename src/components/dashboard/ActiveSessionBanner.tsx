'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Play, Timer } from 'lucide-react'

interface Props {
  sessionId: string
  startedAt: string
  setCount: number
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ActiveSessionBanner({ sessionId, startedAt, setCount }: Props) {
  const t = useTranslations('dashboard.activeSession')
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
  )

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))),
      1000,
    )
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <Link
      href={`/workout/${sessionId}`}
      className="block rounded-2xl p-4 transition active:scale-[0.99]"
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 59, 71, 0.18), rgba(255, 196, 68, 0.10))',
        border: '1px solid rgba(255, 59, 71, 0.35)',
        boxShadow: '0 14px 30px rgba(255, 59, 71, 0.18)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        >
          <Play className="h-5 w-5 text-white" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/85">
            {t('label')}
          </p>
          <p className="text-sm font-extrabold text-white mt-0.5">
            {t('continue')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Timer className="h-3 w-3 text-white/70" />
            <span className="text-sm font-mono font-bold tabular-nums text-white">
              {formatElapsed(elapsed)}
            </span>
          </div>
          {setCount > 0 && (
            <p className="text-[10px] uppercase tracking-widest text-white/55 mt-0.5">
              {t('setsLogged', { n: setCount })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
