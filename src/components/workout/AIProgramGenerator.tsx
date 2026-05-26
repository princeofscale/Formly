'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, Check, X, ChevronRight } from 'lucide-react'
import {
  previewProgramAction,
  saveProgramAsTemplatesAction,
  type PreviewDay,
  type GenerateProgramInput,
} from '@/app/(app)/workout/new/program-actions'

type Goal = 'strength' | 'hypertrophy' | 'general'
type Location = 'gym' | 'home_dumbbells' | 'home_bodyweight'

interface Props {
  defaultLocation: Location
}

type State =
  | { kind: 'form' }
  | { kind: 'loading' }
  | { kind: 'preview'; days: PreviewDay[] }
  | { kind: 'saved'; n: number }
  | { kind: 'error'; message: string }

export function AIProgramGenerator({ defaultLocation }: Props) {
  const t = useTranslations('workout.programGen')
  const tGoal = useTranslations('onboarding')
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState<Goal>('hypertrophy')
  const [days, setDays] = useState(3)
  const [location, setLocation] = useState<Location>(defaultLocation)
  const [state, setState] = useState<State>({ kind: 'form' })
  const [, startSave] = useTransition()

  async function handleGenerate() {
    setState({ kind: 'loading' })
    try {
      const input: GenerateProgramInput = { goal, daysPerWeek: days, location }
      const { days: previewDays } = await previewProgramAction(input)
      if (previewDays.length === 0) {
        setState({ kind: 'error', message: t('emptyResult') })
        return
      }
      setState({ kind: 'preview', days: previewDays })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const isQuota = raw.toLowerCase().includes('quota')
      setState({ kind: 'error', message: isQuota ? t('quotaExhausted') : raw })
    }
  }

  function handleSave() {
    if (state.kind !== 'preview') return
    const days = state.days
    startSave(async () => {
      try {
        const { saved } = await saveProgramAsTemplatesAction({ goal, days })
        setState({ kind: 'saved', n: saved })
      } catch (e) {
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-400/5 px-4 py-3 ring-1 ring-amber-500/30 hover:from-amber-500/20 hover:to-amber-400/10 transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold uppercase tracking-wide text-amber-100">
            {t('cta')}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-amber-400/70" />
      </button>
    )
  }

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-white/[0.08] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-white">{t('title')}</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setState({ kind: 'form' })
          }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {state.kind === 'form' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {tGoal('goalTitle')}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { key: 'strength', label: tGoal('goalStrength') },
                  { key: 'hypertrophy', label: tGoal('goalHypertrophy') },
                  { key: 'general', label: tGoal('goalGeneral') },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoal(key)}
                  className="h-10 rounded-lg text-[11px] font-bold transition"
                  style={{
                    background: goal === key ? 'rgba(255,196,68,0.18)' : 'rgba(255,255,255,0.04)',
                    color: goal === key ? '#FFC044' : 'rgba(255,255,255,0.55)',
                    border:
                      goal === key
                        ? '1px solid rgba(255,196,68,0.4)'
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {t('days')}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className="h-10 rounded-lg text-sm font-bold transition"
                  style={{
                    background: days === n ? 'rgba(255,196,68,0.20)' : 'rgba(255,255,255,0.04)',
                    color: days === n ? '#FFC044' : 'rgba(255,255,255,0.55)',
                    border:
                      days === n
                        ? '1px solid rgba(255,196,68,0.4)'
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {tGoal('locTitle')}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { key: 'gym', label: tGoal('locGym') },
                  { key: 'home_dumbbells', label: tGoal('locDumbbells') },
                  { key: 'home_bodyweight', label: tGoal('locBodyweight') },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocation(key)}
                  className="h-12 rounded-lg text-[10px] font-bold leading-tight transition px-1"
                  style={{
                    background:
                      location === key ? 'rgba(255,196,68,0.18)' : 'rgba(255,255,255,0.04)',
                    color: location === key ? '#FFC044' : 'rgba(255,255,255,0.55)',
                    border:
                      location === key
                        ? '1px solid rgba(255,196,68,0.4)'
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full h-11 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(255,59,71,0.22)] hover:bg-primary/90 active:scale-[0.98] transition"
          >
            {t('generate')}
          </button>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="py-8 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <p className="text-xs text-white/55">{t('generating')}</p>
        </div>
      )}

      {state.kind === 'preview' && (
        <div className="space-y-3">
          <p className="text-[11px] text-white/55">{t('previewIntro', { n: state.days.length })}</p>
          {state.days.map((day, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-2">
                {day.day_label}
              </p>
              <ul className="space-y-1">
                {day.exercises.map((ex, j) => (
                  <li
                    key={j}
                    className="flex items-center justify-between text-[11px] text-white/70"
                  >
                    <span className="truncate flex-1 min-w-0">{ex.name}</span>
                    <span className="text-white/45 font-mono tabular-nums ml-2 flex-shrink-0">
                      {ex.sets}×{ex.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setState({ kind: 'form' })}
              className="flex-1 h-11 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-wide text-white/70 hover:bg-white/10 transition"
            >
              {t('regen')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 h-11 rounded-xl bg-primary text-xs font-extrabold uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(255,59,71,0.22)] hover:bg-primary/90 active:scale-[0.98] transition"
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {state.kind === 'saved' && (
        <div className="py-6 flex flex-col items-center gap-2 text-center">
          <div className="h-10 w-10 rounded-full bg-green-500/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-sm font-bold text-white">{t('savedTitle', { n: state.n })}</p>
          <p className="text-[11px] text-white/55">{t('savedHint')}</p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-300">{t('error')}</p>
          <p className="text-[10px] font-mono text-white/45 break-all">{state.message}</p>
          <button
            type="button"
            onClick={() => setState({ kind: 'form' })}
            className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70"
          >
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  )
}
