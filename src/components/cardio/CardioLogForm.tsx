'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Bike,
  Footprints,
  Waves,
  ActivitySquare,
  Zap,
  MoreHorizontal,
  PersonStanding,
  Loader2,
  Play,
} from 'lucide-react'
import { logCardioAction } from '@/app/(app)/cardio/actions'

const ACTIVITIES = [
  { key: 'running', icon: Footprints, accent: '#2BD884', bg: 'rgba(43,216,132,0.12)' },
  { key: 'cycling', icon: Bike, accent: '#6FA6FF', bg: 'rgba(111,166,255,0.12)' },
  { key: 'swimming', icon: Waves, accent: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  { key: 'rowing', icon: ActivitySquare, accent: '#FF6B35', bg: 'rgba(255,107,53,0.12)' },
  { key: 'walking', icon: PersonStanding, accent: '#FFD64A', bg: 'rgba(255,214,74,0.12)' },
  { key: 'elliptical', icon: ActivitySquare, accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { key: 'hiit', icon: Zap, accent: '#FF6E76', bg: 'rgba(255,110,118,0.12)' },
  { key: 'other', icon: MoreHorizontal, accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
] as const

const PRESETS = [15, 30, 45, 60, 90]

export function CardioLogForm() {
  const t = useTranslations('cardio')
  const [activity, setActivity] = useState<string>('running')
  const [duration, setDuration] = useState<number>(30)
  const [distance, setDistance] = useState('')
  const [avgHr, setAvgHr] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sliderBg = useMemo(() => {
    const pct = ((duration - 5) / (120 - 5)) * 100
    return `linear-gradient(90deg, #FF6B35 0%, #FFB627 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`
  }, [duration])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('activity', activity)
    fd.set('duration_min', String(duration))
    if (distance) fd.set('distance_km', distance)
    if (avgHr) fd.set('avg_hr', avgHr)
    if (calories) fd.set('calories', calories)
    if (notes.trim()) fd.set('notes', notes.trim())
    startTransition(async () => {
      try {
        await logCardioAction(fd)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  const mm = String(duration).padStart(2, '0')
  const activityLabel = t(`activity.${activity}`)

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Activity picker */}
      <div className="tar-d-rise tar-d-rise-1">
        <div className="tar-d-eyebrow" style={{ padding: '0 2px 6px' }}>
          {t('chooseActivity')}
        </div>
        <div className="tar-c-grid">
          {ACTIVITIES.map((a) => {
            const Icon = a.icon
            const on = activity === a.key
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                className={`tar-c-act ${on ? 'on' : ''}`}
              >
                <span className="tar-c-act-ico" style={{ background: a.bg, color: a.accent }}>
                  <Icon />
                </span>
                <span className="tar-c-act-lbl">{t(`activity.${a.key}`)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="tar-c-dur-card tar-d-rise tar-d-rise-2">
        <span className="tar-c-eyebrow">{t('durationLabel')}</span>
        <span className="tar-c-dur-display">
          {mm}
          <span className="sep">:</span>00
        </span>
        <input
          type="range"
          className="tar-c-dur-slider"
          min={5}
          max={120}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={{ background: sliderBg }}
        />
        <div className="tar-c-dur-labels">
          <span>5 {t('minutes')}</span>
          <span>120 {t('minutes')}</span>
        </div>
        <div className="tar-c-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDuration(p)}
              className={`tar-c-chip ${duration === p ? 'on' : ''}`}
            >
              {p} {t('minutes')}
            </button>
          ))}
        </div>
      </div>

      {/* Optional fields */}
      <div className="tar-c-opt tar-d-rise tar-d-rise-3">
        <label className="tar-c-field">
          <span className="lbl">{t('distance')}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="500"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="0.0"
          />
          <span className="unit">{t('distanceUnit')}</span>
        </label>
        <label className="tar-c-field">
          <span className="lbl">{t('avgHr')}</span>
          <input
            type="number"
            inputMode="numeric"
            min="40"
            max="220"
            step="1"
            value={avgHr}
            onChange={(e) => setAvgHr(e.target.value)}
            placeholder="—"
          />
          <span className="unit">{t('bpm')}</span>
        </label>
        <label className="tar-c-field">
          <span className="lbl">{t('calories')}</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="5000"
            step="1"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="—"
          />
          <span className="unit">{t('kcal')}</span>
        </label>
      </div>

      {/* Notes */}
      <div className="tar-d-rise tar-d-rise-3">
        <textarea
          rows={2}
          className="tar-c-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          maxLength={500}
        />
      </div>

      {error && (
        <p className="text-[11px]" style={{ color: 'var(--tar-danger)' }}>
          {error}
        </p>
      )}

      {/* Start CTA */}
      <button type="submit" disabled={isPending} className="tar-c-start tar-d-rise tar-d-rise-4">
        {isPending ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
        {isPending ? t('saving') : t('startBtn', { activity: activityLabel, min: duration })}
      </button>
    </form>
  )
}
