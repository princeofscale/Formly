'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Flame } from 'lucide-react'
import type { StrengthRatio, StrengthTier } from '@/lib/services/strength-standards.service'
import { weightUnit } from '@/lib/units'

interface Props {
  ratios: StrengthRatio[]
  bodyweightKg: number | null
}

const TIER_STYLE: Record<StrengthTier, { color: string; bg: string; label: string }> = {
  beginner:     { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', label: 'Beginner' },
  novice:       { color: '#5EEAD4', bg: 'rgba(94, 234, 212, 0.12)',  label: 'Novice' },
  intermediate: { color: '#FFC044', bg: 'rgba(255, 196, 68, 0.14)',  label: 'Intermediate' },
  advanced:     { color: '#FF6E76', bg: 'rgba(255, 110, 118, 0.14)', label: 'Advanced' },
  elite:        { color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.16)', label: 'Elite' },
}

export function StrengthRatiosCard({ ratios, bodyweightKg }: Props) {
  const t = useTranslations('progress.strength')
  const locale = useLocale()
  const kg = weightUnit(locale)

  if (!bodyweightKg) {
    return (
      <div
        className="rounded-[20px] p-5"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 110, 118, 0.14)' }}
          >
            <Flame className="h-4 w-4" style={{ color: '#FF6E76' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FF6E76' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        <p className="text-xs text-white/45">{t('noBodyweight')}</p>
      </div>
    )
  }

  if (ratios.length === 0) {
    return (
      <div
        className="rounded-[20px] p-5"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 110, 118, 0.14)' }}
          >
            <Flame className="h-4 w-4" style={{ color: '#FF6E76' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FF6E76' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        <p className="text-xs text-white/45">{t('noData')}</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 110, 118, 0.14)' }}
          >
            <Flame className="h-4 w-4" style={{ color: '#FF6E76' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FF6E76' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          BW {bodyweightKg.toFixed(1)} {kg}
        </span>
      </div>

      <div className="space-y-3">
        {ratios.map(r => {
          const tier = TIER_STYLE[r.tier]
          const name = locale === 'ru' ? (r.exerciseNameRu ?? r.exerciseName) : r.exerciseName
          // Progress to next tier (0..1)
          const progress = r.nextTierAt
            ? Math.min(1, (r.ratio % r.nextTierAt) / r.nextTierAt)
            : 1
          return (
            <div key={r.exerciseSlug} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-white truncate">{name}</span>
                <span
                  className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                  style={{ background: tier.bg, color: tier.color }}
                >
                  {t(`tiers.${r.tier}`)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{
                        width: `${progress * 100}%`,
                        background: tier.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-white/60 shrink-0">
                  {r.bestE1rm.toFixed(0)} {kg} · <span style={{ color: tier.color }}>{r.ratio.toFixed(2)}×</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-white/35">
        {t('hint')}
      </p>
    </div>
  )
}
