'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { calculate1RM, selectFormula } from '@/lib/utils/one-rep-max'
import { weightUnit } from '@/lib/units'

const ROWS = [
  { pct: 50, reps: '×15+', hot: false },
  { pct: 55, reps: '×12', hot: false },
  { pct: 60, reps: '×10', hot: false },
  { pct: 65, reps: '×9', hot: false },
  { pct: 70, reps: '×8', hot: false },
  { pct: 75, reps: '×7', hot: false },
  { pct: 80, reps: '×6', hot: false },
  { pct: 85, reps: '×4', hot: true },
  { pct: 90, reps: '×3', hot: true },
  { pct: 95, reps: '×2', hot: true },
]

// Round working weights to the nearest 2.5 (plate math)
function roundPlate(v: number): number {
  return Math.round(v / 2.5) * 2.5
}

function fmt(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

export function OneRMCalculator() {
  const t = useTranslations('tools.oneRM')
  const locale = useLocale()
  const kg = weightUnit(locale)
  const [weight, setWeight] = useState('100')
  const [reps, setReps] = useState('5')

  const result = useMemo(() => {
    const w = Number(weight.replace(',', '.'))
    const r = parseInt(reps)
    if (!Number.isFinite(w) || w <= 0) return null
    if (!Number.isInteger(r) || r <= 0 || r > 30) return null
    try {
      const e1rm = calculate1RM(w, r)
      return { w, r, e1rm, formula: selectFormula(r) }
    } catch {
      return null
    }
  }, [weight, reps])

  const fxLine = !result
    ? t('fxEmpty')
    : result.r === 1
      ? t('fxSingle')
      : result.formula === 'brzycki'
        ? `Brzycki · ${fmt(result.w)} / (1.0278 − 0.0278 × ${result.r}) = ${fmt(Math.round(result.e1rm * 10) / 10)} ${kg}`
        : `Epley · ${fmt(result.w)} × (1 + ${result.r}/30) = ${fmt(Math.round(result.e1rm * 10) / 10)} ${kg}`

  return (
    <>
      <div className="tar-rm-hero tar-d-rise tar-d-rise-2">
        <div className="tar-d-eyebrow accent">{t('formTitle')}</div>
        <div className="tar-rm-fields">
          <label className="tar-rm-field">
            <span className="lbl">
              {t('weight')}
              <span>{kg}</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="2.5"
              min="1"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <span className="tar-rm-x">×</span>
          <label className="tar-rm-field">
            <span className="lbl">
              {t('reps')}
              <span>1–30</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="30"
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </label>
        </div>
        <div className="tar-rm-res">
          <div>
            <div className="tar-d-eyebrow">{t('estimated1rm')}</div>
            {result ? (
              <div className="tar-rm-out tar-grad-text tabular-nums">
                {result.e1rm.toFixed(1)}
                <em>{kg}</em>
              </div>
            ) : (
              <div className="tar-rm-out" style={{ color: 'var(--tar-ink-soft)' }}>
                —
              </div>
            )}
          </div>
          {result && (
            <span className="tar-rm-badge">
              {result.formula === 'brzycki' ? 'Brzycki' : 'Epley'}
            </span>
          )}
        </div>
        <div className="tar-rm-fx">{fxLine}</div>
      </div>

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3">{t('percentChart')}</div>
      <div
        className="tar-rm-tbl tar-d-rise tar-d-rise-3"
        style={!result ? { opacity: 0.55 } : undefined}
      >
        {ROWS.map((row) => (
          <div key={row.pct} className={`tar-rm-trow${row.hot ? ' hot' : ''}`}>
            <span className="pct tabular-nums">{row.pct}%</span>
            <span className="tar-rm-bar">
              <i style={{ transform: `scaleX(${result ? row.pct / 100 : 0})` }} />
            </span>
            <span className="kg tabular-nums">
              <span>{result ? fmt(roundPlate((result.e1rm * row.pct) / 100)) : '—'}</span>
              {result && <em>{kg}</em>}
            </span>
            <span className="reps">{row.reps}</span>
          </div>
        ))}
      </div>
    </>
  )
}
