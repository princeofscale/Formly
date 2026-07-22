'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Check, ChevronDown, Flame, Share2, X } from 'lucide-react'
import type { WrappedReport } from '@/lib/services/wrapped.service'
import { weightUnit } from '@/lib/units'

interface Props {
  report: WrappedReport
}

const ELEPHANT_KG = 6000
const ELEPHANT_DOTS = 30

export function WrappedView({ report }: Props) {
  const t = useTranslations('wrapped')
  const locale = useLocale()
  const loc = locale === 'ru' ? 'ru-RU' : 'en-US'
  const kg = weightUnit(locale)
  const [shared, setShared] = useState(false)

  const b = (chunks: React.ReactNode) => <b>{chunks}</b>
  const exName = (e: { exerciseName: string; exerciseNameRu: string | null }) =>
    locale === 'ru' ? (e.exerciseNameRu ?? e.exerciseName) : e.exerciseName

  const elephants = Math.floor(report.totalTonnageKg / ELEPHANT_KG)

  const bestMonth = useMemo(
    () =>
      report.monthly.reduce(
        (best, m) => (m.tonnageKg > best.tonnageKg ? m : best),
        report.monthly[0],
      ),
    [report.monthly],
  )
  const maxMonthTonnage = Math.max(1, ...report.monthly.map((m) => m.tonnageKg))

  const monthName = (m: number, format: 'long' | 'narrow') => {
    const s = new Date(Date.UTC(2024, m, 1)).toLocaleDateString(loc, { month: format })
    return format === 'long' ? s.charAt(0).toUpperCase() + s.slice(1) : s
  }

  async function share() {
    const text = t('slides.shareText', {
      year: report.year,
      sessions: report.totalSessions,
      tonnage: report.totalTonnageKg.toLocaleString(loc),
    })
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 1400)
    } catch {
      // ignore
    }
  }

  const closeBtn = (
    <Link href="/dashboard" className="tar-w-iconbtn tar-wr-close" aria-label={t('slides.close')}>
      <X className="h-4 w-4" />
    </Link>
  )

  if (!report.hasData) {
    return (
      <div className="tar-wr">
        {closeBtn}
        <div className="tar-wr-slide hero" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p className="tar-wr-ghostyear tabular-nums">{report.year}</p>
          <span className="tar-wr-eyebrow" style={{ marginTop: 20 }}>
            {t('slides.emptyEyebrow')}
          </span>
          <p className="tar-wr-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            {t('noData')}
          </p>
          <Link href="/workout/new" className="tar-cta" style={{ marginTop: 26 }}>
            {t('slides.emptyCta')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="tar-wr">
      {closeBtn}

      {/* 1 · Hero year */}
      <div className="tar-wr-slide hero">
        <span className="tar-wr-eyebrow accent">{t('slides.eyebrow')}</span>
        <p className="tar-wr-huge tar-grad-text tabular-nums">{report.year}</p>
        <p className="tar-wr-sub">
          {report.isInProgress ? t('subtitleInProgress') : t('subtitle')}
        </p>
        <div className="tar-wr-hint">
          <span>{t('slides.hint')}</span>
          <ChevronDown className="i" />
        </div>
      </div>

      {/* 2 · Tonnage */}
      <div className="tar-wr-slide">
        <span className="tar-wr-eyebrow">{t('slides.tonnageEyebrow')}</span>
        <p
          className="tar-wr-huge tar-grad-text tabular-nums"
          style={{ fontSize: 'clamp(44px, 15vw, 72px)' }}
        >
          {report.totalTonnageKg.toLocaleString(loc)}
        </p>
        <div className="tar-wr-unit">{t('slides.tonnageUnit')}</div>
        <p className="tar-wr-sub">
          {elephants >= 1
            ? t.rich('slides.tonnageElephants', { n: elephants, b })
            : t.rich('slides.tonnageSub', {
                sets: report.totalSets.toLocaleString(loc),
                reps: report.totalReps.toLocaleString(loc),
                b,
              })}
        </p>
        {elephants >= 1 && (
          <div className="tar-wr-el" aria-hidden="true">
            {Array.from({ length: ELEPHANT_DOTS }, (_, i) => (
              <i key={i} className={i < Math.min(elephants, ELEPHANT_DOTS) ? undefined : 'dim'} />
            ))}
          </div>
        )}
      </div>

      {/* 3 · Favorite exercise */}
      {report.topExercises.length > 0 && (
        <div className="tar-wr-slide">
          <span className="tar-wr-eyebrow">{t('slides.favEyebrow')}</span>
          <p className="tar-wr-huge mid tar-grad-text">{exName(report.topExercises[0])}</p>
          <p className="tar-wr-sub">
            {t.rich('slides.favSub', { sets: report.topExercises[0].sets, b })}
          </p>
          <div className="tar-wr-rows">
            {report.topExercises.map((e, i) => (
              <div className="tar-wr-row" key={i}>
                <span className="rank tabular-nums">{i + 1}</span>
                <span className="nm">{exName(e)}</span>
                <span
                  className={`val tabular-nums${i === 0 ? ' tar-grad-text' : ''}`}
                  style={i > 0 ? { color: 'var(--tar-ink-dim)' } : undefined}
                >
                  {e.sets}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 · Streak */}
      {report.longestStreakDays > 0 && (
        <div className="tar-wr-slide">
          <div className="tar-wr-flame">
            <Flame className="i" />
          </div>
          <span className="tar-wr-eyebrow">{t('slides.streakEyebrow')}</span>
          <p className="tar-wr-huge tar-grad-text tabular-nums">{report.longestStreakDays}</p>
          <div className="tar-wr-unit">
            {t('slides.streakUnit', { n: report.longestStreakDays })}
          </div>
          <p className="tar-wr-sub">{t('slides.streakSub')}</p>
        </div>
      )}

      {/* 5 · PRs (gold) */}
      {report.topPRs.length > 0 && (
        <div className="tar-wr-slide gold">
          <span className="tar-wr-eyebrow" style={{ color: 'var(--tar-warning)' }}>
            {t('slides.prEyebrow')}
          </span>
          <p className="tar-wr-huge gold tabular-nums">
            {Math.round(report.topPRs[0].bestWeightKg)}
          </p>
          <div className="tar-wr-unit">
            {kg} · {t('slides.prUnit')}
          </div>
          <div className="tar-wr-rows">
            {report.topPRs.slice(0, 3).map((pr, i) => (
              <div className="tar-wr-row" key={i}>
                <span className="rank tabular-nums">{i + 1}</span>
                <span className="nm">{exName(pr)}</span>
                <span className="val tabular-nums" style={{ color: 'var(--tar-warning)' }}>
                  {Math.round(pr.bestWeightKg)} {kg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 · Best month */}
      {bestMonth.sessions > 0 && (
        <div className="tar-wr-slide">
          <span className="tar-wr-eyebrow">{t('slides.monthEyebrow')}</span>
          <p className="tar-wr-huge mid tar-grad-text">{monthName(bestMonth.month, 'long')}</p>
          <p className="tar-wr-sub">
            {t.rich('slides.monthSub', {
              sessions: bestMonth.sessions,
              tonnage: Math.round(bestMonth.tonnageKg).toLocaleString(loc),
              b,
            })}
          </p>
          <div className="tar-wr-bars" aria-hidden="true">
            {report.monthly.map((m) => (
              <span key={m.month} className={`col${m.month === bestMonth.month ? ' hot' : ''}`}>
                <i style={{ height: `${Math.max(4, (m.tonnageKg / maxMonthTonnage) * 100)}%` }} />
                <em>{monthName(m.month, 'narrow')}</em>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 7 · Finale */}
      <div className="tar-wr-slide hero" style={{ alignItems: 'flex-start' }}>
        <p className="tar-wr-fin" style={{ color: 'var(--tar-ink)' }}>
          {t('slides.fin1')}
        </p>
        <p className="tar-wr-fin tar-grad-text">{t('slides.fin2')}</p>
        <p className="tar-wr-fin" style={{ color: 'var(--tar-ink)' }}>
          {t('slides.fin3')}
        </p>
        <button type="button" onClick={share} className="tar-cta" style={{ marginTop: 30 }}>
          {shared ? (
            <Check className="i" style={{ width: 16, height: 16 }} />
          ) : (
            <Share2 className="i" style={{ width: 16, height: 16 }} />
          )}
          {t('slides.share')}
        </button>
        <div className="tar-wr-hint">
          <span className="tar-wr-foot">
            {t('slides.foot', { yy: String(report.year).slice(-2) })}
          </span>
        </div>
      </div>
    </div>
  )
}
