'use client'

import { useTranslations } from 'next-intl'
import { CheckIcon } from './icons'

function scorePassword(pw: string) {
  if (!pw) return { score: 0, checks: { len: false, num: false, upp: false, sym: false } }
  const checks = {
    len: pw.length >= 8,
    num: /\d/.test(pw),
    upp: /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    sym: /[^A-Za-z0-9]/.test(pw),
  }
  let s = Object.values(checks).filter(Boolean).length
  if (pw.length >= 12 && s >= 3) s = 4
  return { score: s, checks }
}

const STRENGTH_COLOR = [
  '#3a3a44',
  'linear-gradient(90deg,#FF4D5E,#FF7A5C)',
  'linear-gradient(90deg,#FFB627,#FFD15C)',
  'linear-gradient(90deg,#FF6B35,#FFB627)',
  'linear-gradient(90deg,#2BD884,#5EE6A8)',
]
const STRENGTH_GLOW = [
  'transparent',
  'rgba(255,77,94,0.35)',
  'rgba(255,182,39,0.35)',
  'rgba(255,107,53,0.35)',
  'rgba(43,216,132,0.35)',
]

export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations('auth.strength')
  const { score, checks } = scorePassword(value)
  const labels = [t('weak'), t('weak'), t('okay'), t('good'), t('iron')]

  return (
    <div className="tar-strength">
      <div className="tar-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={'tar-strength-bar ' + (score >= i ? 'on' : '')}
            style={
              {
                '--bar-color': STRENGTH_COLOR[score],
                '--bar-glow': STRENGTH_GLOW[score],
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="tar-strength-meta">
        <span>{t('label')}</span>
        <span
          className="label"
          style={{
            color: score >= 3 ? '#FFB627' : score >= 1 ? '#FF8A6E' : 'rgba(245,241,232,0.42)',
          }}
        >
          {labels[score]}
        </span>
      </div>
      <div className="tar-checks">
        <Check on={checks.len} label={t('checks.len')} />
        <Check on={checks.upp} label={t('checks.case')} />
        <Check on={checks.num} label={t('checks.digit')} />
        <Check on={checks.sym} label={t('checks.symbol')} />
      </div>
    </div>
  )
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <div className={'tar-check ' + (on ? 'on' : '')}>
      <span className="dot">
        <CheckIcon />
      </span>
      <span>{label}</span>
    </div>
  )
}
