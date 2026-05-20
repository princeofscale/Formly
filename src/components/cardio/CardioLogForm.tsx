'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Bike, Footprints, Waves, ActivitySquare, Zap, MoreHorizontal, Loader2 } from 'lucide-react'
import { logCardioAction } from '@/app/(app)/cardio/actions'

const ACTIVITIES = [
  { key: 'running', icon: Footprints },
  { key: 'cycling', icon: Bike },
  { key: 'walking', icon: Footprints },
  { key: 'swimming', icon: Waves },
  { key: 'rowing', icon: ActivitySquare },
  { key: 'elliptical', icon: ActivitySquare },
  { key: 'hiit', icon: Zap },
  { key: 'other', icon: MoreHorizontal },
] as const

export function CardioLogForm() {
  const t = useTranslations('cardio')
  const [activity, setActivity] = useState<string>('running')
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('')
  const [avgHr, setAvgHr] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('activity', activity)
    fd.set('duration_min', duration)
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[20px] p-5 space-y-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Activity picker */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('activityLabel')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITIES.map(a => {
            const Icon = a.icon
            const active = activity === a.key
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                className="h-20 rounded-[10px] flex flex-col items-center justify-center gap-1 transition-colors"
                style={{
                  background: active ? 'rgba(255, 59, 71, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                  border: active ? '1px solid #FF3B47' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t(`activity.${a.key}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration (required) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('durationLabel')} *
        </label>
        <div className="relative">
          <input
            type="number" inputMode="numeric" min="1" max="600" step="1"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            required
            className="w-full h-11 px-3 pr-12 rounded-[8px] font-mono font-bold text-base bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('minutes')}
          </span>
        </div>
      </div>

      {/* Optional metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('distance')}
          </label>
          <div className="relative">
            <input
              type="number" inputMode="decimal" step="0.1" min="0" max="500"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              placeholder="—"
              className="w-full h-10 px-2 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('distanceUnit')}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('avgHr')}
          </label>
          <input
            type="number" inputMode="numeric" min="40" max="220" step="1"
            value={avgHr}
            onChange={e => setAvgHr(e.target.value)}
            placeholder="—"
            className="w-full h-10 px-2 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('bpm')}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t('calories')}
          </label>
          <input
            type="number" inputMode="numeric" min="0" max="5000" step="1"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            placeholder="—"
            className="w-full h-10 px-2 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('kcal')}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('notesLabel')}
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          maxLength={500}
          className="w-full px-3 py-2 rounded-[8px] text-sm bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 resize-none"
        />
      </div>

      {error && <p className="text-[11px]" style={{ color: '#FF6E76' }}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-[10px] text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: '#FF3B47' }}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t('saving') : t('save')}
      </button>
    </form>
  )
}
