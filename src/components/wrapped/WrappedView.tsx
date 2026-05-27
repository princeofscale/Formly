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

  const maxMonth = useMemo(
    () => Math.max(1, ...report.monthly.map((m) => m.tonnageKg)),
    [report.monthly],
  )

  if (!report.hasData) {
    return (
      <div
        className="rounded-[24px] p-8 text-center"
        style={{ background: 'var(--tar-bg-elevated)', border: '1px solid var(--tar-line)' }}
      >
        <p
          className="mb-2"
          style={{ font: '800 32px/1 var(--tar-tight)', color: 'var(--tar-ink)' }}
        >
          {report.year}
        </p>
        <p className="text-sm" style={{ color: 'var(--tar-ink-mute)' }}>
          {t('noData')}
        </p>
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
    <div className="space-y-3 pb-8">
      {/* Title card — conic-gradient hero, year in gradient text */}
      <Card gradient="conic">
        <div className="flex flex-col items-center justify-center text-center py-2">
          <span
            style={{
              font: '700 11px/1 var(--tar-mono)',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--tar-ink-mute)',
            }}
          >
            {report.isInProgress ? t('introInProgress') : t('intro')}
          </span>
          <p
            className="mt-2 tabular-nums"
            style={{
              font: '900 110px/0.9 var(--tar-tight)',
              letterSpacing: '-0.05em',
              background:
                'linear-gradient(135deg, #FFD64A 0%, #FFB627 35%, #FF6B35 75%, #FF4D5E 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 8px 30px rgba(255,182,39,0.35))',
            }}
          >
            {report.year}
          </p>
          <p
            className="mt-3 max-w-xs"
            style={{
              font: '500 13px/1.4 var(--tar-text)',
              color: 'var(--tar-ink-mute)',
            }}
          >
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
          value={
            report.cardioKm > 0 ? report.cardioKm.toLocaleString() : `${report.cardioSessions}`
          }
          unit={report.cardioKm > 0 ? 'km' : t('cards.cardio.unitSessions')}
          sub={t('cards.cardio.sub', { count: report.cardioSessions })}
          accent="#5EEAD4"
        />
      )}

      {/* Top PRs */}
      {report.topPRs.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="tar-s-mglyph"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--tar-brand-grad-soft)',
                border: '1px solid rgba(255,182,39,0.35)',
                color: 'var(--tar-brand-2)',
              }}
            >
              <Trophy className="h-[18px] w-[18px]" />
            </span>
            <div>
              <div className="tar-d-eyebrow">{t('cards.topPRs.label')}</div>
              <div
                style={{
                  font: '700 14px/1.2 var(--tar-text)',
                  color: 'var(--tar-ink)',
                  marginTop: 2,
                }}
              >
                {t('cards.topPRs.title')}
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {report.topPRs.map((pr, i) => {
              const name =
                locale === 'ru' ? (pr.exerciseNameRu ?? pr.exerciseName) : pr.exerciseName
              return (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3"
                  style={{
                    padding: '8px 0',
                    borderTop: i > 0 ? '1px solid var(--tar-line)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="tabular-nums w-7"
                      style={{
                        font: '900 22px/1 var(--tar-tight)',
                        letterSpacing: '-0.02em',
                        color: 'rgba(255,196,68,0.55)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="truncate"
                      style={{
                        font: '700 14px/1.2 var(--tar-text)',
                        color: 'var(--tar-ink)',
                      }}
                    >
                      {name}
                    </span>
                  </div>
                  <span
                    className="shrink-0 tabular-nums"
                    style={{
                      font: '800 17px/1 var(--tar-tight)',
                      letterSpacing: '-0.02em',
                      background: 'var(--tar-brand-grad)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
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
          <div className="tar-d-eyebrow">{t('cards.monthly.label')}</div>
          <div
            style={{
              font: '700 14px/1.2 var(--tar-text)',
              color: 'var(--tar-ink)',
              marginTop: 2,
            }}
          >
            {t('cards.monthly.title')}
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {report.monthly.map((m) => {
            const h = maxMonth > 0 ? Math.max(2, (m.tonnageKg / maxMonth) * 100) : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background:
                      m.sessions > 0
                        ? 'linear-gradient(180deg, #FFB627, rgba(255,107,53,0.25))'
                        : 'rgba(255,255,255,0.04)',
                  }}
                  title={`${m.sessions} sessions · ${m.tonnageKg.toLocaleString()} ${kg}`}
                />
                <span
                  className="tabular-nums"
                  style={{
                    font: '500 9px/1 var(--tar-mono)',
                    color: 'var(--tar-ink-soft)',
                  }}
                >
                  {monthShort(m.month, locale)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center pt-2">
        <p
          style={{
            font: '500 10px/1 var(--tar-mono)',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--tar-ink-soft)',
          }}
        >
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
  const bg =
    gradient === 'conic'
      ? 'conic-gradient(from 230deg at 50% 50%, rgba(255,196,68,0.16), rgba(255, 110, 118, 0.10), rgba(167, 139, 250, 0.14), rgba(94, 234, 212, 0.10), rgba(255,196,68,0.16)), var(--tar-bg-elevated)'
      : 'var(--tar-bg-elevated)'
  return (
    <div
      className="rounded-[24px] p-5 sm:p-6 relative overflow-hidden"
      style={{ background: bg, border: '1px solid var(--tar-line)' }}
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
      className="rounded-[24px] p-5 sm:p-6 relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 0% 0%, ${accent}1F, transparent 55%), var(--tar-bg-elevated)`,
        border: `1px solid ${accent}33`,
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="tar-s-mglyph"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${accent}24`,
            border: `1px solid ${accent}44`,
            color: accent,
          }}
        >
          {icon}
        </span>
        <div
          style={{
            font: '700 10px/1 var(--tar-mono)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {label}
        </div>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="tabular-nums"
          style={{
            font: smallValue ? '900 52px/0.95 var(--tar-tight)' : '900 92px/0.9 var(--tar-tight)',
            letterSpacing: '-0.04em',
            color: accent,
            textShadow: `0 6px 30px ${accent}55`,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              font: '500 18px/1 var(--tar-mono)',
              letterSpacing: '0.06em',
              color: 'var(--tar-ink-mute)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      <p
        className="mt-3"
        style={{
          font: '500 13px/1.4 var(--tar-text)',
          color: 'var(--tar-ink-mute)',
        }}
      >
        {sub}
      </p>
    </div>
  )
}
