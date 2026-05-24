'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
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

const CONFETTI_COLORS = ['#FFC044', '#FF6E76', '#22D3A8', '#A78BFA', '#FFFFFF']

interface Particle {
  id: number
  left: number
  delay: number
  duration: number
  rotate: number
  color: string
  size: number
}

// Pure deterministic particle generator — call from useMemo
function generateParticles(seed: number, count: number): Particle[] {
  const result: Particle[] = []
  // Deterministic LCG, kept local to this call
  let s = seed || 1
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280
    const r1 = s / 233280
    s = (s * 9301 + 49297) % 233280
    const r2 = s / 233280
    s = (s * 9301 + 49297) % 233280
    const r3 = s / 233280
    s = (s * 9301 + 49297) % 233280
    const r4 = s / 233280
    s = (s * 9301 + 49297) % 233280
    const r5 = s / 233280
    s = (s * 9301 + 49297) % 233280
    const r6 = s / 233280
    result.push({
      id: i,
      left: r1 * 100,
      delay: r2 * 0.4,
      duration: 1.4 + r3 * 1.6,
      rotate: r4 * 720 - 360,
      color: CONFETTI_COLORS[Math.floor(r5 * CONFETTI_COLORS.length)],
      size: 6 + r6 * 8,
    })
  }
  return result
}

function useParticles(seed: number, count = 32): Particle[] {
  return useMemo(() => generateParticles(seed, count), [seed, count])
}

export function PRCelebration({ pr, onDone }: Props) {
  const t = useTranslations('workout.prCelebration')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const onDoneRef = useRef(onDone)

  // Keep the ref up-to-date without writing during render
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const particles = useParticles(pr?.nonce ?? 0, 36)

  // Vibration + auto-dismiss
  useEffect(() => {
    if (!pr) return
    try { navigator.vibrate?.([20, 60, 20, 60, 120]) } catch {}
    const timer = setTimeout(() => onDoneRef.current(), 2400)
    return () => clearTimeout(timer)
  }, [pr])

  if (!pr) return null

  const isFirst = pr.improvementPct == null
  const deltaText = isFirst
    ? t('firstTime')
    : `+${pr.improvementPct!.toFixed(1)}%`

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none animate-in fade-in duration-200"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(255, 196, 68, 0.25), rgba(0,0,0,0.65) 70%)',
      }}
      aria-live="polite"
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute block"
            style={{
              left: `${p.left}%`,
              top: '-10%',
              width: p.size,
              height: p.size,
              background: p.color,
              transform: `rotate(${p.rotate}deg)`,
              borderRadius: 2,
              animation: `pr-fall ${p.duration}s linear ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Hero badge */}
      <div className="relative flex flex-col items-center gap-2 px-4 animate-in zoom-in-50 duration-500">
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFD566, #FFC044 40%, #E5A52F 80%)',
            boxShadow: '0 0 60px rgba(255,196,68,0.55), inset 0 4px 12px rgba(255,255,255,0.4)',
          }}
        >
          <Trophy className="h-12 w-12 text-black" />
        </div>

        <p
          className="text-[12px] font-extrabold uppercase tracking-[0.32em] mt-2"
          style={{ color: '#FFC044' }}
        >
          {t('label')}
        </p>
        <h2
          className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight"
          style={{ textShadow: '0 4px 30px rgba(255,196,68,0.45)' }}
        >
          {t('title')}
        </h2>

        <div className="mt-2 flex flex-col items-center">
          <p className="text-base font-bold text-white/90 text-center max-w-xs">
            {pr.exerciseName}
          </p>
          <p
            className="mt-1 text-3xl font-extrabold tabular-nums"
            style={{ color: '#FFC044' }}
          >
            {pr.newE1rm.toFixed(1)} <span className="text-base font-mono text-white/45">{kg}</span>
            <span className="ml-3 text-2xl">{deltaText}</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pr-fall {
          0%   { transform: translateY(-20vh) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
