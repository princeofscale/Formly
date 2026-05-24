'use client'

import { useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Flame, Zap, Timer, Trophy, Activity, Clock, CalendarCheck, MapPin } from 'lucide-react'
import type { WrappedReport } from '@/lib/services/wrapped.service'
import { weightUnit } from '@/lib/units'

interface Props {
  report: WrappedReport
}

// Muscle group → display string (mirror of the labels in messages/*.json but
// keep this self-contained because Wrapped is one-shot).
const MUSCLE_FALLBACK = (m: string) => m.replace(/_/g, ' ')

export function WrappedView({ report }: Props) {
  const t = useTranslations('wrapped')
  const tHistory = useTranslations('history')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const totalHours = useMemo(() => {
    const h = Math.floor(report.totalMinutes / 60)
    const m = report.totalMinutes % 60
    return { h, m }
  }, [report.totalMinutes])

  const maxMonth = useMemo(() => Math.max(1, ...report.monthly.map(m => m.tonnageKg)), [report.monthly])

  if (!report.hasData) {
    return (
      <div
        className="rounded-[24px] p-8 text-center"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-2xl font-extrabold text-white mb-2">{report.year}</p>
        <p className="text-sm text-white/45">{t('noData')}</p>
      </div>
    )
  }

  const muscleLabel = (key: string) => {
    try {
      const v = tHistory(`muscleLabel.${key}` as Parameters<typeof tHistory>[0])
      return v || MUSCLE_FALLBACK(key)
    } catch {
      return MUSCLE_FALLBACK(key)
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Title card */}
      <Card gradient="conic">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55">
            {report.isInProgress ? t('introInProgress') : t('intro')}
          </span>
          <p className="mt-2 text-[80px] sm:text-[110px] leading-none font-extrabold tabular-nums" style={{ color: '#FFC044', textShadow: '0 6px 30px rgba(255,196,68,0.35)' }}>
            {report.year}
          </p>
          <p className="mt-2 text-sm text-white/55 max-w-xs">
            {report.isInProgress ? t('subtitleInProgress') : t('subtitle')}
          </p>
        </div>
      </Card>

      {/* Sessions count */}
      <BigStatCard
        icon={<CalendarCheck className="h-5 w-5" style={{ color: '#FFC044' }} />}
        label={t('cards.sessions.label')}
        value={report.totalSessions.toLocaleString()}
        unit={t('cards.sessions.unit')}
        sub={t('cards.sessions.sub', { cardio: report.cardioSessions })}
        accent="#FFC044"
      />

      {/* Tonnage */}
      <BigStatCard
        icon={<Zap className="h-5 w-5" style={{ color: '#22D3A8' }} />}
        label={t('cards.tonnage.label')}
        value={report.totalTonnageKg.toLocaleString()}
        unit={kg}
        sub={t('cards.tonnage.sub', { count: report.totalSets, reps: report.totalReps })}
        accent="#22D3A8"
      />

      {/* Minutes */}
      <BigStatCard
        icon={<Timer className="h-5 w-5" style={{ color: '#A78BFA' }} />}
        label={t('cards.duration.label')}
        value={`${totalHours.h}`}
        unit={`h ${totalHours.m}m`}
        sub={t('cards.duration.sub')}
        accent="#A78BFA"
      />

      {/* Best day */}
      {report.bestDay && (
        <BigStatCard
          icon={<Flame className="h-5 w-5" style={{ color: '#FF6E76' }} />}
          label={t('cards.bestDay.label')}
          value={report.bestDay.tonnageKg.toLocaleString()}
          unit={kg}
          sub={new Date(report.bestDay.date + 'T00:00:00').toLocaleDateString(
            locale === 'ru' ? 'ru-RU' : 'en-US',
            { day: 'numeric', month: 'long', year: 'numeric' },
          )}
          accent="#FF6E76"
        />
      )}

      {/* Longest streak */}
      {report.longestStreakDays > 0 && (
        <BigStatCard
          icon={<Activity className="h-5 w-5" style={{ color: '#5EEAD4' }} />}
          label={t('cards.streak.label')}
          value={`${report.longestStreakDays}`}
          unit={t('cards.streak.unit')}
          sub={t('cards.streak.sub')}
          accent="#5EEAD4"
        />
      )}

      {/* Favorite hour */}
      {report.favoriteHour != null && (
        <BigStatCard
          icon={<Clock className="h-5 w-5" style={{ color: '#FFC044' }} />}
          label={t('cards.favHour.label')}
          value={`${String(report.favoriteHour).padStart(2, '0')}:00`}
          unit=""
          sub={t('cards.favHour.sub')}
          accent="#FFC044"
        />
      )}

      {/* Top muscle */}
      {report.topMuscle && (
        <BigStatCard
          icon={<MapPin className="h-5 w-5" style={{ color: '#A78BFA' }} />}
          label={t('cards.topMuscle.label')}
          value={muscleLabel(report.topMuscle.muscle).toUpperCase()}
          unit=""
          sub={t('cards.topMuscle.sub', { sets: report.topMuscle.sets })}
          accent="#A78BFA"
          smallValue
        />
      )}

      {/* Cardio */}
      {report.cardioSessions > 0 && (
        <BigStatCard
          icon={<MapPin className="h-5 w-5" style={{ color: '#5EEAD4' }} />}
          label={t('cards.cardio.label')}
          value={report.cardioKm > 0 ? report.cardioKm.toLocaleString() : `${report.cardioSessions}`}
          unit={report.cardioKm > 0 ? 'km' : t('cards.cardio.unitSessions')}
          sub={t('cards.cardio.sub', { count: report.cardioSessions })}
          accent="#5EEAD4"
        />
      )}

      {/* Top PRs */}
      {report.topPRs.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 196, 68, 0.16)' }}>
              <Trophy className="h-4 w-4" style={{ color: '#FFC044' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC044' }}>
                {t('cards.topPRs.label')}
              </p>
              <p className="text-sm font-bold text-white">{t('cards.topPRs.title')}</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {report.topPRs.map((pr, i) => {
              const name = locale === 'ru' ? (pr.exerciseNameRu ?? pr.exerciseName) : pr.exerciseName
              return (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl font-extrabold tabular-nums w-7" style={{ color: 'rgba(255,196,68,0.55)' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-white truncate">{name}</span>
                  </div>
                  <span className="shrink-0 text-base font-extrabold tabular-nums" style={{ color: '#FFC044' }}>
                    {pr.e1rm.toFixed(1)} {kg}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Monthly sparkline */}
      <Card>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('cards.monthly.label')}
          </p>
          <p className="text-sm font-bold text-white">{t('cards.monthly.title')}</p>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {report.monthly.map(m => {
            const h = maxMonth > 0 ? Math.max(2, (m.tonnageKg / maxMonth) * 100) : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background: m.sessions > 0
                      ? 'linear-gradient(180deg, #FFC044, rgba(255,196,68,0.18))'
                      : 'rgba(255,255,255,0.04)',
                  }}
                  title={`${m.sessions} sessions · ${m.tonnageKg.toLocaleString()} ${kg}`}
                />
                <span className="text-[9px] font-mono text-white/35 tabular-nums">
                  {monthShort(m.month, locale)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center pt-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
          {t('footer')}
        </p>
      </div>
    </div>
  )
}

function monthShort(m: number, locale: string): string {
  const d = new Date(Date.UTC(2024, m, 1))
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' })
}

interface CardProps {
  children: React.ReactNode
  gradient?: 'conic' | 'none'
}

function Card({ children, gradient = 'none' }: CardProps) {
  const bg = gradient === 'conic'
    ? 'conic-gradient(from 230deg at 50% 50%, rgba(255,196,68,0.14), rgba(255, 110, 118, 0.08), rgba(167, 139, 250, 0.12), rgba(94, 234, 212, 0.10), rgba(255,196,68,0.14)), #0D0D12'
    : '#15151C'
  return (
    <div
      className="rounded-[24px] p-5 sm:p-6"
      style={{ background: bg, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {children}
    </div>
  )
}

interface BigStatProps {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  sub: string
  accent: string
  smallValue?: boolean
}

function BigStatCard({ icon, label, value, unit, sub, accent, smallValue }: BigStatProps) {
  return (
    <div
      className="rounded-[24px] p-5 sm:p-6"
      style={{
        background: `radial-gradient(circle at 0% 0%, ${accent}1F, transparent 50%), #15151C`,
        border: `1px solid ${accent}33`,
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ background: `${accent}24` }}
        >
          {icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
          {label}
        </p>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-extrabold tabular-nums leading-none ${smallValue ? 'text-[42px] sm:text-[56px]' : 'text-[68px] sm:text-[92px]'}`}
          style={{ color: accent, textShadow: `0 6px 30px ${accent}55` }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-lg sm:text-xl text-white/45 font-mono">{unit}</span>
        )}
      </div>

      <p className="mt-3 text-sm text-white/55">{sub}</p>
    </div>
  )
}
