'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Sigma } from 'lucide-react'
import { calculate1RM, selectFormula } from '@/lib/utils/one-rep-max'
import { weightUnit } from '@/lib/units'

const PERCENTAGES = [
  { pct: 60, reps: 16, label: 'Endurance' },
  { pct: 65, reps: 14, label: 'Endurance' },
  { pct: 70, reps: 12, label: 'Hypertrophy' },
  { pct: 75, reps: 10, label: 'Hypertrophy' },
  { pct: 80, reps: 8, label: 'Strength' },
  { pct: 85, reps: 6, label: 'Strength' },
  { pct: 90, reps: 4, label: 'Power' },
  { pct: 95, reps: 2, label: 'Power' },
  { pct: 100, reps: 1, label: 'Max' },
]

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
      return { e1rm, formula: selectFormula(r) }
    } catch {
      return null
    }
  }, [weight, reps])

  return (
    <div className="space-y-3">
      {/* Input + hero result card — uses the same tar-pl-ai aesthetic
          (rotating-ish gradient stroke + radial glow) for visual interest */}
      <section className="tar-rec-hero">
        <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
          <span
            className="tar-s-mglyph chest"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--tar-brand-grad-soft)',
              border: '1px solid rgba(255,182,39,0.35)',
              color: 'var(--tar-brand-2)',
            }}
          >
            <Sigma />
          </span>
          <div>
            <div className="tar-d-eyebrow">{t('label')}</div>
            <div
              style={{
                font: '700 14px/1.2 var(--tar-text)',
                color: 'var(--tar-ink)',
                marginTop: 2,
              }}
            >
              {t('formTitle')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="tar-c-field" style={{ padding: '12px 14px' }}>
            <span className="lbl">
              {t('weight')} <span style={{ opacity: 0.6 }}>({kg})</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.5"
              min="0.5"
              style={{
                font: '800 22px/1 var(--tar-tight)',
                letterSpacing: '-0.02em',
              }}
            />
          </label>
          <label className="tar-c-field" style={{ padding: '12px 14px' }}>
            <span className="lbl">{t('reps')}</span>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              step="1"
              min="1"
              max="30"
              style={{
                font: '800 22px/1 var(--tar-tight)',
                letterSpacing: '-0.02em',
              }}
            />
          </label>
        </div>

        <div
          className="flex items-baseline justify-between"
          style={{ marginTop: 18, position: 'relative', zIndex: 1 }}
        >
          <div>
            <div className="tar-d-eyebrow">{t('estimated1rm')}</div>
            <div
              style={{
                font: '800 52px/1 var(--tar-tight)',
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
                background: 'var(--tar-brand-grad)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                marginTop: 6,
              }}
            >
              {result ? result.e1rm.toFixed(1) : '—'}
              <span
                style={{
                  font: '500 18px/1 var(--tar-mono)',
                  marginLeft: 8,
                  color: 'var(--tar-ink-mute)',
                  letterSpacing: '0.1em',
                  WebkitTextFillColor: 'var(--tar-ink-mute)',
                }}
              >
                {kg}
              </span>
            </div>
          </div>
          {result && (
            <span className="tar-lib-feat-badge" style={{ alignSelf: 'flex-end', marginBottom: 6 }}>
              {result.formula === 'brzycki' ? 'Brzycki' : 'Epley'}
            </span>
          )}
        </div>
      </section>

      {/* % chart */}
      {result && (
        <section className="tar-pg-card">
          <div className="tar-d-eyebrow" style={{ marginBottom: 10 }}>
            {t('percentChart')}
          </div>
          <div>
            {PERCENTAGES.map((row) => {
              const load = (result.e1rm * row.pct) / 100
              const tierColor =
                row.pct >= 90
                  ? '#FF6E76'
                  : row.pct >= 80
                    ? '#FFC044'
                    : row.pct >= 70
                      ? '#5EEAD4'
                      : 'var(--tar-ink-mute)'
              return (
                <div
                  key={row.pct}
                  className="flex items-center gap-3"
                  style={{
                    padding: '8px 0',
                    borderTop: '1px solid var(--tar-line)',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      font: '700 12px/1 var(--tar-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      color: tierColor,
                    }}
                  >
                    {row.pct}%
                  </span>
                  <span
                    style={{
                      flex: 1,
                      font: '700 14px/1 var(--tar-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--tar-ink)',
                    }}
                  >
                    {load.toFixed(1)} {kg}
                  </span>
                  <span
                    style={{
                      font: '500 10px/1 var(--tar-mono)',
                      color: 'var(--tar-ink-mute)',
                      width: 44,
                      textAlign: 'right',
                    }}
                  >
                    × {row.reps}
                  </span>
                  <span
                    style={{
                      font: '700 9px/1 var(--tar-mono)',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: tierColor,
                      width: 92,
                      textAlign: 'right',
                    }}
                  >
                    {t(`zones.${row.label.toLowerCase()}`)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
