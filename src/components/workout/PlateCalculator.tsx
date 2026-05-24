'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { calculatePlates } from '@/lib/utils/plate-calculator'
import { weightUnit } from '@/lib/units'

interface Props {
  weightKg: number
}

const BAR_OPTIONS = [20, 15, 10, 0] as const
type BarWeight = (typeof BAR_OPTIONS)[number]

const BAR_PREF_KEY = 'plateCalc:bar'

// Visual sizing of plate strips. Width scales with plate weight; height fixed.
const PLATE_VISUAL: Record<number, { width: number; bg: string; text: string }> = {
  25: { width: 56, bg: '#DC2626', text: 'white' },
  20: { width: 50, bg: '#2563EB', text: 'white' },
  15: { width: 44, bg: '#EAB308', text: '#1A1A1A' },
  10: { width: 38, bg: '#16A34A', text: 'white' },
  5: { width: 28, bg: '#E5E7EB', text: '#1A1A1A' },
  2.5: { width: 22, bg: '#CBD5E1', text: '#1A1A1A' },
  1.25: { width: 18, bg: '#9CA3AF', text: 'white' },
  0.5: { width: 14, bg: '#71717A', text: 'white' },
}

export function PlateCalculator({ weightKg }: Props) {
  const t = useTranslations('workout.plateCalculator')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const [bar, setBar] = useState<BarWeight>(() => {
    if (typeof window === 'undefined') return 20
    const raw = window.localStorage.getItem(BAR_PREF_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (BAR_OPTIONS.includes(parsed as BarWeight)) return parsed as BarWeight
    }
    return 20
  })

  function pickBar(b: BarWeight) {
    setBar(b)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BAR_PREF_KEY, String(b))
    }
  }

  if (!weightKg || weightKg <= 0) return null

  const { plates, leftover, belowBar, loadedPerSide } = calculatePlates(weightKg, bar)

  return (
    <div
      className="mt-2 rounded-lg p-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
          {t('label')}
        </p>
        <div className="flex items-center gap-1">
          {BAR_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => pickBar(b)}
              className="text-[10px] font-mono px-2 py-1 rounded transition"
              style={{
                background: bar === b ? 'rgba(255, 196, 68, 0.18)' : 'rgba(255,255,255,0.04)',
                color: bar === b ? '#FFC044' : 'rgba(255,255,255,0.5)',
              }}
            >
              {b === 0 ? t('noBar') : `${b}кг`}
            </button>
          ))}
        </div>
      </div>

      {belowBar ? (
        <p className="text-xs text-white/45">{t('belowBar', { bar })}</p>
      ) : plates.length === 0 ? (
        <p className="text-xs text-white/55">{t('barOnly')}</p>
      ) : (
        <>
          {/* Visual barbell */}
          <div className="flex items-center justify-center my-3">
            {/* Left side plates (reverse so heaviest is innermost) */}
            <div className="flex items-center gap-0.5 flex-row-reverse">
              {plates.flatMap((p) =>
                Array.from({ length: p.count }, (_, i) => {
                  const v = PLATE_VISUAL[p.weight] ?? PLATE_VISUAL[1.25]
                  return (
                    <div
                      key={`L-${p.weight}-${i}`}
                      className="h-10 rounded-sm flex items-center justify-center text-[9px] font-bold tabular-nums"
                      style={{ width: v.width / 4, minWidth: 5, background: v.bg, color: v.text }}
                      title={`${p.weight}${kg}`}
                    />
                  )
                }),
              )}
            </div>
            {/* Bar */}
            <div className="h-1.5 flex-1 max-w-[120px] mx-1" style={{ background: '#71717A' }} />
            {/* Sleeve (collar) */}
            <div className="h-3 w-1 bg-zinc-500" />
            {/* Right side plates */}
            <div className="flex items-center gap-0.5">
              {plates.flatMap((p) =>
                Array.from({ length: p.count }, (_, i) => {
                  const v = PLATE_VISUAL[p.weight] ?? PLATE_VISUAL[1.25]
                  return (
                    <div
                      key={`R-${p.weight}-${i}`}
                      className="h-10 rounded-sm flex items-center justify-center text-[9px] font-bold tabular-nums"
                      style={{ width: v.width / 4, minWidth: 5, background: v.bg, color: v.text }}
                      title={`${p.weight}${kg}`}
                    />
                  )
                }),
              )}
            </div>
          </div>

          {/* Plate counts (per-side summary) */}
          <div className="flex flex-wrap gap-1.5">
            {plates.map((p) => {
              const v = PLATE_VISUAL[p.weight] ?? PLATE_VISUAL[1.25]
              return (
                <span
                  key={p.weight}
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded tabular-nums"
                  style={{ background: v.bg, color: v.text }}
                >
                  {p.count}×{p.weight}
                </span>
              )
            })}
            <span className="text-[10px] font-mono text-white/40 tabular-nums ml-1 self-center">
              · {t('perSide', { kg: loadedPerSide.toFixed(2).replace(/\.?0+$/, '') })}
            </span>
          </div>

          {leftover > 0.01 && (
            <p className="mt-2 text-[10px]" style={{ color: '#FFC044' }}>
              {t('leftover', { kg: leftover.toFixed(2) })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
