'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sigma } from 'lucide-react'
import { calculate1RM, selectFormula } from '@/lib/utils/one-rep-max'

const PERCENTAGES = [
  { pct: 60,  reps: 16, label: 'Endurance' },
  { pct: 65,  reps: 14, label: 'Endurance' },
  { pct: 70,  reps: 12, label: 'Hypertrophy' },
  { pct: 75,  reps: 10, label: 'Hypertrophy' },
  { pct: 80,  reps:  8, label: 'Strength' },
  { pct: 85,  reps:  6, label: 'Strength' },
  { pct: 90,  reps:  4, label: 'Power' },
  { pct: 95,  reps:  2, label: 'Power' },
  { pct: 100, reps:  1, label: 'Max' },
]

export function OneRMCalculator() {
  const t = useTranslations('tools.oneRM')
  const [weight, setWeight] = useState('100')
  const [reps, setReps] = useState('5')

  const result = useMemo(() => {
    const w = Number(weight.replace(',', '.'))
    const r = parseInt(reps)
    if (!Number.isFinite(w) || w <= 0) return null
    if (!Number.isInteger(r) || r <= 0 || r > 30) return null
    try {
      const e1rm = calculate1RM(w, r)
      return { e1rm, formula: selectFormula(r) }
    } catch {
      return null
    }
  }, [weight, reps])

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div
        className="rounded-[20px] p-5"
        style={{ background: '#15151C', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 196, 68, 0.16)' }}
          >
            <Sigma className="h-4 w-4" style={{ color: '#FFC044' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC044' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('formTitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {t('weight')} <span className="text-white/25">(kg)</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              step="0.5"
              min="0.5"
              className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-3 text-xl font-bold tabular-nums text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {t('reps')}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              step="1"
              min="1"
              max="30"
              className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-3 text-xl font-bold tabular-nums text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
            />
          </label>
        </div>

        {/* Hero result */}
        <div className="mt-5 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/45">{t('estimated1rm')}</p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums" style={{ color: '#FFC044' }}>
              {result ? result.e1rm.toFixed(1) : '—'}
              <span className="text-xl text-white/40 font-mono ml-2">kg</span>
            </p>
          </div>
          {result && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm"
              style={{ background: 'rgba(255, 196, 68, 0.14)', color: '#FFC044' }}
            >
              {result.formula === 'brzycki' ? 'Brzycki' : 'Epley'}
            </span>
          )}
        </div>
      </div>

      {/* % chart */}
      {result && (
        <div
          className="rounded-[20px] p-5"
          style={{ background: '#15151C', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3 text-white/40">
            {t('percentChart')}
          </p>
          <div className="space-y-1.5">
            {PERCENTAGES.map(row => {
              const load = (result.e1rm * row.pct) / 100
              const tierColor =
                row.pct >= 90 ? '#FF6E76' :
                row.pct >= 80 ? '#FFC044' :
                row.pct >= 70 ? '#5EEAD4' :
                '#94A3B8'
              return (
                <div key={row.pct} className="flex items-center gap-3 py-1 border-t border-white/[0.04]">
                  <span className="w-10 text-xs font-mono font-bold tabular-nums" style={{ color: tierColor }}>
                    {row.pct}%
                  </span>
                  <span className="flex-1 text-sm font-mono font-bold tabular-nums text-white">
                    {load.toFixed(1)} kg
                  </span>
                  <span className="text-[10px] font-mono text-white/40 w-12 text-right">
                    × {row.reps}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest w-24 text-right"
                    style={{ color: tierColor }}
                  >
                    {t(`zones.${row.label.toLowerCase()}`)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
