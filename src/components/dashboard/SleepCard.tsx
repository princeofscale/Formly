'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Moon, Check, X } from 'lucide-react'
import { logSleepAction, deleteSleepAction } from '@/app/(app)/dashboard/actions'

interface Props {
  todayDate: string
  todayHours: number | null
  weekAvg: number | null
  weekDays: { date: string; hours: number }[]
}

const QUICK_HOURS = [6, 7, 8, 9]

export function SleepCard({ todayDate, todayHours, weekAvg, weekDays }: Props) {
  const t = useTranslations('dashboard.sleep')

  const [hours, setHours] = useState<number | null>(todayHours)
  const [editing, setEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(String(todayHours ?? ''))
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function saveHours(value: number) {
    if (!Number.isFinite(value) || value <= 0 || value > 24) return
    setBusy(true)
    startTransition(async () => {
      try {
        await logSleepAction(todayDate, value)
        setHours(value)
        setEditing(false)
      } finally {
        setBusy(false)
      }
    })
  }

  function clearHours() {
    setBusy(true)
    startTransition(async () => {
      try {
        await deleteSleepAction(todayDate)
        setHours(null)
        setEditing(false)
        setDraftValue('')
      } finally {
        setBusy(false)
      }
    })
  }

  const tone =
    hours == null ? '#FFC044' : hours < 6 ? '#FF6E76' : hours >= 7 ? '#5EEAD4' : '#FFC044'

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(94, 234, 212, 0.12)' }}
        >
          <Moon className="h-4 w-4" style={{ color: '#5EEAD4' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#5EEAD4' }}
          >
            {t('label')}
          </p>
          <p className="text-sm font-bold text-white">{t('title')}</p>
        </div>
        {weekAvg != null && (
          <div className="text-right">
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {t('weekAvg')}
            </p>
            <p
              className="text-sm font-bold font-mono tabular-nums"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {weekAvg.toFixed(1)} {t('hoursShort')}
            </p>
          </div>
        )}
      </div>

      {/* Today's value */}
      {!editing && (
        <button
          type="button"
          onClick={() => {
            setEditing(true)
            setDraftValue(String(hours ?? ''))
          }}
          className="w-full flex items-baseline gap-2 py-2 group"
        >
          <span className="text-3xl font-bold tabular-nums" style={{ color: tone }}>
            {hours != null ? hours.toFixed(1) : '—'}
          </span>
          <span
            className="text-[11px] uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {t('today')}
          </span>
          <span
            className="ml-auto text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#FF3B47' }}
          >
            {hours != null ? t('edit') : t('log')}
          </span>
        </button>
      )}

      {editing && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="24"
              step="0.5"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              autoFocus
              placeholder="7.5"
              className="flex-1 h-10 px-3 rounded-[8px] font-mono font-bold text-base bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => saveHours(parseFloat(draftValue))}
              disabled={busy || !parseFloat(draftValue)}
              className="h-10 px-3 rounded-[8px] text-white text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#FF3B47' }}
            >
              <Check className="h-4 w-4" />
            </button>
            {hours != null && (
              <button
                type="button"
                onClick={clearHours}
                disabled={busy}
                className="h-10 px-3 rounded-[8px] text-xs transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 100, 100, 0.85)',
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {QUICK_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => saveHours(h)}
                disabled={busy}
                className="flex-1 h-8 rounded-[6px] text-[11px] font-mono font-bold tracking-tight transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {h}
                {t('hoursShort')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weekly bars */}
      {weekDays.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-7 gap-1 items-end" style={{ height: 36 }}>
            {weekDays.map((d, i) => {
              const heightPct = Math.min(100, (d.hours / 10) * 100)
              const color = d.hours < 6 ? '#FF6E76' : d.hours >= 7 ? '#5EEAD4' : '#FFC044'
              return (
                <div
                  key={d.date + i}
                  className="rounded-t-sm relative group"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: 3,
                    background: color,
                    opacity: 0.85,
                  }}
                  title={`${d.date}: ${d.hours.toFixed(1)} ${t('hoursShort')}`}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
