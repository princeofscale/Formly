'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trophy, Timer, Layers, Zap } from 'lucide-react'
import type { SessionSummary } from '@/lib/services/session-summary.service'

interface Props {
  summary: SessionSummary
}

export function SessionSummaryHero({ summary }: Props) {
  const t = useTranslations('history.summary')
  const locale = useLocale()

  const dt = summary.comparison?.deltaTonnagePct ?? null
  const deltaColor = dt == null ? '#FFFFFF99' : dt > 0 ? '#22D3A8' : dt < 0 ? '#FF6E76' : '#FFFFFF99'
  const deltaText = dt == null ? '—' : `${dt > 0 ? '+' : ''}${dt.toFixed(1)}%`

  return (
    <div
      className="rounded-[24px] p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(255, 196, 68, 0.10), transparent 55%), radial-gradient(circle at 100% 100%, rgba(167, 139, 250, 0.10), transparent 55%), #15151C',
        border: '1px solid rgba(255, 196, 68, 0.22)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 196, 68, 0.18)' }}
        >
          <Trophy className="h-5 w-5" style={{ color: '#FFC044' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC044' }}>
            {t('label')}
          </p>
          <p className="text-base font-extrabold text-white">{t('title')}</p>
        </div>
      </div>

      {/* Big stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Zap className="h-3.5 w-3.5" style={{ color: '#FFC044' }} />}
          label={t('tonnage')}
          value={`${summary.totalVolumeKg.toLocaleString()}`}
          unit="kg"
        />
        <StatTile
          icon={<Layers className="h-3.5 w-3.5" style={{ color: '#5EEAD4' }} />}
          label={t('sets')}
          value={`${summary.totalSets}`}
          subValue={`${summary.totalReps} ${t('reps')}`}
        />
        <StatTile
          icon={<Timer className="h-3.5 w-3.5" style={{ color: '#A78BFA' }} />}
          label={t('duration')}
          value={summary.durationMinutes != null ? `${summary.durationMinutes}` : '—'}
          unit={summary.durationMinutes != null ? 'min' : undefined}
        />
        <StatTile
          icon={<Trophy className="h-3.5 w-3.5" style={{ color: deltaColor }} />}
          label={t('vsPrev')}
          value={deltaText}
          valueColor={deltaColor}
          subValue={
            summary.comparison?.prevTonnage != null
              ? `${summary.comparison.prevTonnage.toLocaleString()} kg`
              : undefined
          }
        />
      </div>

      {/* New PRs */}
      {summary.prs.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: '#FFC044' }}>
            🏆 {t('prsHeader', { n: summary.prs.length })}
          </p>
          <div className="space-y-1.5">
            {summary.prs.slice(0, 5).map(pr => {
              const name = locale === 'ru' ? (pr.exerciseNameRu ?? pr.exerciseName) : pr.exerciseName
              const isFirst = pr.improvementPct == null
              return (
                <div key={pr.exerciseId} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white truncate">{name}</span>
                  <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: '#FFC044' }}>
                    {pr.newBest.toFixed(1)} kg
                    {!isFirst && (
                      <span className="text-white/45 ml-2">
                        +{pr.improvementPct!.toFixed(1)}%
                      </span>
                    )}
                    {isFirst && <span className="text-white/45 ml-2">{t('firstTime')}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top exercises */}
      {summary.topExercises.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2 text-white/40">
            {t('topLifts')}
          </p>
          <div className="space-y-1.5">
            {summary.topExercises.map(ex => {
              const name = locale === 'ru' ? (ex.nameRu ?? ex.name) : ex.name
              const maxVol = summary.topExercises[0].volume
              const pct = maxVol > 0 ? (ex.volume / maxVol) * 100 : 0
              return (
                <div key={ex.exerciseId} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs tabular-nums">
                    <span className="text-white truncate">{name}</span>
                    <span className="text-white/55 shrink-0">{ex.volume.toLocaleString()} kg · {ex.sets} {t('setsShort')}</span>
                  </div>
                  <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, background: '#FFC044' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface TileProps {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  subValue?: string
  valueColor?: string
}

function StatTile({ icon, label, value, unit, subValue, valueColor }: TileProps) {
  return (
    <div
      className="rounded-[14px] p-3 flex flex-col"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className="text-xl sm:text-2xl font-extrabold tabular-nums leading-none"
          style={{ color: valueColor ?? '#FFFFFF' }}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] text-white/40 font-mono">{unit}</span>}
      </div>
      {subValue && <span className="mt-0.5 text-[10px] text-white/35 font-mono tabular-nums">{subValue}</span>}
    </div>
  )
}
