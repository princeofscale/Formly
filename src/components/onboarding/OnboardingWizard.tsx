'use client'

import { useState, useTransition } from 'react'
import {
  Dumbbell,
  Trophy,
  Flame,
  Building2,
  Home,
  Hand,
  Bell,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { finishOnboardingAction, skipOnboardingAction } from '@/app/(app)/onboarding/actions'
import { subscribeToPushAction } from '@/app/(app)/profile/push-actions'
import { requestPushSubscription } from '@/lib/utils/push-subscribe'

interface Labels {
  step: string
  back: string
  next: string
  skip: string
  finish: string
  hero: string
  subtitle: string
  goalTitle: string
  goalSub: string
  goalStrength: string
  goalStrengthSub: string
  goalHypertrophy: string
  goalHypertrophySub: string
  goalGeneral: string
  goalGeneralSub: string
  locTitle: string
  locSub: string
  locGym: string
  locGymSub: string
  locDumbbells: string
  locDumbbellsSub: string
  locBodyweight: string
  locBodyweightSub: string
  daysTitle: string
  daysSub: string
  daysSuffix: string
  notifTitle: string
  notifSub: string
  notifEnable: string
  notifEnabled: string
  notifLater: string
  notifDenied: string
  notifUnsupported: string
}

interface ExtraProps {
  vapidPublicKey?: string
}

type Goal = 'strength' | 'hypertrophy' | 'general'
type Location = 'gym' | 'home_dumbbells' | 'home_bodyweight'

export function OnboardingWizard({ labels, vapidPublicKey }: { labels: Labels } & ExtraProps) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal>('hypertrophy')
  const [location, setLocation] = useState<Location>('gym')
  const [days, setDays] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [notifState, setNotifState] = useState<
    'idle' | 'on' | 'denied' | 'unsupported' | 'no-key' | 'error'
  >('idle')
  const [notifDiagnostic, setNotifDiagnostic] = useState<string | null>(null)
  const [, startNotif] = useTransition()

  const total = 4

  async function enableNotifications() {
    setNotifDiagnostic(null)
    if (!vapidPublicKey) {
      setNotifState('no-key')
      return
    }
    const result = await requestPushSubscription(vapidPublicKey)
    if (result.status === 'granted') {
      startNotif(async () => {
        try {
          await subscribeToPushAction(result.payload)
          setNotifState('on')
        } catch (e) {
          setNotifState('error')
          setNotifDiagnostic(e instanceof Error ? e.message : String(e))
        }
      })
      return
    }
    if (result.status === 'denied') {
      setNotifState('denied')
      return
    }
    if (result.status === 'unsupported') {
      setNotifState('unsupported')
      setNotifDiagnostic(result.reason)
      return
    }
    if (result.status === 'no-key') {
      setNotifState('no-key')
      return
    }
    setNotifState('error')
    setNotifDiagnostic(result.error instanceof Error ? result.error.message : String(result.error))
  }
  const pct = ((step + 1) / total) * 100

  function next() {
    setStep((s) => Math.min(total - 1, s + 1))
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center pt-4">
        <p className="text-2xl mb-2">🏋️</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{labels.hero}</h1>
        <p className="mt-1 text-sm text-white/55">{labels.subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-white/40 text-center">
          {labels.step.replace('{n}', String(step + 1)).replace('{total}', String(total))}
        </p>
        <div
          className="relative h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: '#FFC044' }}
          />
        </div>
      </div>

      {/* Step content */}
      {step === 0 && <StepGoal value={goal} onChange={setGoal} labels={labels} />}
      {step === 1 && <StepLocation value={location} onChange={setLocation} labels={labels} />}
      {step === 2 && <StepDays value={days} onChange={setDays} labels={labels} />}
      {step === 3 && (
        <StepNotifications
          state={notifState}
          diagnostic={notifDiagnostic}
          onEnable={enableNotifications}
          labels={labels}
        />
      )}

      {/* Footer buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="flex-1 flex items-center justify-center gap-1 h-12 rounded-xl bg-white/5 text-sm font-bold text-white/70 hover:bg-white/10 transition"
            >
              <ChevronLeft className="h-4 w-4" /> {labels.back}
            </button>
          ) : (
            <form action={skipOnboardingAction} className="flex-1">
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-white/5 text-sm font-bold text-white/45 hover:bg-white/10 transition"
              >
                {labels.skip}
              </button>
            </form>
          )}

          {step < total - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 flex items-center justify-center gap-1 h-12 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98]"
            >
              {labels.next} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <form
              action={finishOnboardingAction}
              onSubmit={() => setSubmitting(true)}
              className="flex-1"
            >
              <input type="hidden" name="goal" value={goal} />
              <input type="hidden" name="location" value={location} />
              <input type="hidden" name="days" value={days} />
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? '...' : labels.finish}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

interface OptionProps {
  active: boolean
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
  accent: string
}

function Option({ active, icon, title, sub, onClick, accent }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl p-4 transition active:scale-[0.99]"
      style={{
        background: active ? `${accent}1F` : 'rgba(255,255,255,0.03)',
        border: active ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}24`, color: accent }}
      >
        {icon}
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[11px] text-white/55 leading-tight">{sub}</p>
      </div>
    </button>
  )
}

function StepGoal({
  value,
  onChange,
  labels,
}: {
  value: Goal
  onChange: (g: Goal) => void
  labels: Labels
}) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-1">
        <h2 className="text-xl font-extrabold text-white">{labels.goalTitle}</h2>
        <p className="text-sm text-white/55 mt-1">{labels.goalSub}</p>
      </div>
      <Option
        active={value === 'strength'}
        icon={<Trophy className="h-5 w-5" />}
        title={labels.goalStrength}
        sub={labels.goalStrengthSub}
        accent="#FFC044"
        onClick={() => onChange('strength')}
      />
      <Option
        active={value === 'hypertrophy'}
        icon={<Dumbbell className="h-5 w-5" />}
        title={labels.goalHypertrophy}
        sub={labels.goalHypertrophySub}
        accent="#FF6E76"
        onClick={() => onChange('hypertrophy')}
      />
      <Option
        active={value === 'general'}
        icon={<Flame className="h-5 w-5" />}
        title={labels.goalGeneral}
        sub={labels.goalGeneralSub}
        accent="#5EEAD4"
        onClick={() => onChange('general')}
      />
    </div>
  )
}

function StepLocation({
  value,
  onChange,
  labels,
}: {
  value: Location
  onChange: (l: Location) => void
  labels: Labels
}) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-1">
        <h2 className="text-xl font-extrabold text-white">{labels.locTitle}</h2>
        <p className="text-sm text-white/55 mt-1">{labels.locSub}</p>
      </div>
      <Option
        active={value === 'gym'}
        icon={<Building2 className="h-5 w-5" />}
        title={labels.locGym}
        sub={labels.locGymSub}
        accent="#A78BFA"
        onClick={() => onChange('gym')}
      />
      <Option
        active={value === 'home_dumbbells'}
        icon={<Home className="h-5 w-5" />}
        title={labels.locDumbbells}
        sub={labels.locDumbbellsSub}
        accent="#5EEAD4"
        onClick={() => onChange('home_dumbbells')}
      />
      <Option
        active={value === 'home_bodyweight'}
        icon={<Hand className="h-5 w-5" />}
        title={labels.locBodyweight}
        sub={labels.locBodyweightSub}
        accent="#FFC044"
        onClick={() => onChange('home_bodyweight')}
      />
    </div>
  )
}

interface StepNotificationsProps {
  state: 'idle' | 'on' | 'denied' | 'unsupported' | 'no-key' | 'error'
  diagnostic: string | null
  onEnable: () => void
  labels: Labels
}

function StepNotifications({ state, diagnostic, onEnable, labels }: StepNotificationsProps) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-1">
        <div
          className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'rgba(255, 196, 68, 0.16)' }}
        >
          <Bell className="h-5 w-5" style={{ color: '#FFC044' }} />
        </div>
        <h2 className="text-xl font-extrabold text-white">{labels.notifTitle}</h2>
        <p className="text-sm text-white/55 mt-1">{labels.notifSub}</p>
      </div>

      {state === 'idle' && (
        <button
          type="button"
          onClick={onEnable}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-extrabold uppercase tracking-wide transition active:scale-[0.98]"
          style={{
            background: 'rgba(255, 196, 68, 0.12)',
            color: '#FFC044',
            border: '1px solid rgba(255, 196, 68, 0.32)',
          }}
        >
          <Bell className="h-4 w-4" />
          {labels.notifEnable}
        </button>
      )}

      {state === 'on' && (
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: 'rgba(34, 211, 168, 0.08)',
            border: '1px solid rgba(34, 211, 168, 0.30)',
            color: '#22D3A8',
          }}
        >
          <p className="text-sm font-bold">✓ {labels.notifEnabled}</p>
        </div>
      )}

      {state === 'denied' && (
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-xs text-white/55">{labels.notifDenied}</p>
        </div>
      )}

      {state === 'unsupported' && (
        <div
          className="rounded-xl p-3 text-center space-y-1"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-xs text-white/55">{labels.notifUnsupported}</p>
          {diagnostic && (
            <p className="text-[10px] font-mono text-white/35">reason: {diagnostic}</p>
          )}
        </div>
      )}

      {state === 'no-key' && (
        <div
          className="rounded-xl p-3 text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-xs text-white/55">
            Сервер не настроен (VAPID-ключ отсутствует) — это не твой браузер, это сайт.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div
          className="rounded-xl p-3 text-center space-y-1"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.20)',
          }}
        >
          <p className="text-xs text-red-300/80">Ошибка подключения уведомлений</p>
          {diagnostic && (
            <p className="text-[10px] font-mono text-white/45 break-all">{diagnostic}</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-white/35 text-center px-4">{labels.notifLater}</p>
    </div>
  )
}

function StepDays({
  value,
  onChange,
  labels,
}: {
  value: number
  onChange: (d: number) => void
  labels: Labels
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white">{labels.daysTitle}</h2>
        <p className="text-sm text-white/55 mt-1">{labels.daysSub}</p>
      </div>

      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p
          className="text-7xl font-extrabold tabular-nums"
          style={{ color: '#FFC044', textShadow: '0 6px 20px rgba(255,196,68,0.25)' }}
        >
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-2">
          {labels.daysSuffix}
        </p>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="h-10 rounded-lg text-sm font-bold transition"
            style={{
              background: value === n ? 'rgba(255,196,68,0.20)' : 'rgba(255,255,255,0.04)',
              color: value === n ? '#FFC044' : 'rgba(255,255,255,0.55)',
              border:
                value === n ? '1px solid rgba(255,196,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
              gridColumn: n === 7 ? 'span 2' : 'span 1',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
