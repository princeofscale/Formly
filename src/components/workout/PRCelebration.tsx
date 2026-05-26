'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { weightUnit } from '@/lib/units'

export interface PRCelebrationData {
  exerciseName: string
  newE1rm: number
  improvementPct: number | null
  /** Refresh key — bump on every new PR to retrigger the overlay. */
  nonce: number
}

interface Props {
  pr: PRCelebrationData | null
  onDone: () => void
}

interface Spark {
  tx: number
  ty: number
  delay: number
}

function buildSparks(count: number): Spark[] {
  const out: Spark[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const radius = 120 + (i % 3) * 30
    out.push({
      tx: Math.cos(angle) * radius,
      ty: Math.sin(angle) * radius,
      delay: 0.1 + (i % 6) * 0.04,
    })
  }
  return out
}

export function PRCelebration({ pr, onDone }: Props) {
  const t = useTranslations('workout.prCelebration')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const sparks = useMemo(() => buildSparks(12), [])

  useEffect(() => {
    if (!pr) return
    try {
      navigator.vibrate?.([20, 40, 30])
    } catch {}
    const timer = setTimeout(() => onDoneRef.current(), 3200)
    return () => clearTimeout(timer)
  }, [pr])

  if (!pr) return null

  const isFirst = pr.improvementPct == null
  const deltaText = isFirst ? t('firstTime') : `+${pr.improvementPct!.toFixed(1)}%`

  return (
    <div
      className="tar-w-pr-overlay show"
      onClick={() => onDoneRef.current()}
      aria-live="polite"
      role="alert"
    >
      <div className="tar-w-pr-flash" />
      <div className="tar-w-pr-card">
        <div className="tar-w-pr-sparks">
          {sparks.map((s, i) => (
            <span
              key={i}
              style={
                {
                  '--tx': `${s.tx}px`,
                  '--ty': `${s.ty}px`,
                  animationDelay: `${s.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className="tar-w-pr-tag">{t('label')}</div>
        <div className="tar-w-pr-weight">
          {pr.newE1rm.toFixed(1)}
          <span style={{ fontSize: 28, marginLeft: 6, opacity: 0.85 }}>{kg}</span>
        </div>
        <div className="tar-w-pr-delta">{deltaText}</div>
        <div className="tar-w-pr-ex">{pr.exerciseName}</div>
      </div>
    </div>
  )
}
