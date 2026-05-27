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
import { finishOnboardingAction, skipOnboardingAction } from '@/app/onboarding/actions'
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
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Hero */}
      <div className="text-center pt-4">
        <p style={{ font: '400 26px/1 var(--tar-tight)', marginBottom: 8 }}>🏋️</p>
        <h1
          style={{
            font: '800 28px/1.1 var(--tar-tight)',
            letterSpacing: '-0.03em',
            color: 'var(--tar-ink)',
          }}
        >
          {labels.hero}
        </h1>
        <p
          className="mt-2"
          style={{
            font: '500 13px/1.4 var(--tar-text)',
            color: 'var(--tar-ink-mute)',
          }}
        >
          {labels.subtitle}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="tar-d-eyebrow text-center">
          {labels.step.replace('{n}', String(step + 1)).replace('{total}', String(total))}
        </div>
        <div
          className="relative h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--tar-line)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: 'var(--tar-brand-grad)' }}
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
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="flex-1 flex items-center justify-center gap-1 transition"
            style={{
              height: 48,
              borderRadius: 14,
              background: 'var(--tar-card)',
              border: '1px solid var(--tar-line)',
              color: 'var(--tar-ink-dim)',
              font: '700 13px/1 var(--tar-text)',
              letterSpacing: '0.02em',
            }}
          >
            <ChevronLeft className="h-4 w-4" /> {labels.back}
          </button>
        ) : (
          <form action={skipOnboardingAction} className="flex-1">
            <button
              type="submit"
              className="w-full transition"
              style={{
                height: 48,
                borderRadius: 14,
                background: 'var(--tar-card)',
                border: '1px solid var(--tar-line)',
                color: 'var(--tar-ink-mute)',
                font: '600 13px/1 var(--tar-text)',
                letterSpacing: '0.02em',
              }}
            >
              {labels.skip}
            </button>
          </form>
        )}

        {step < total - 1 ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 tar-c-start"
            style={{ height: 48, font: '800 13px/1 var(--tar-text)' }}
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
              className="w-full tar-c-start"
              style={{ height: 48, font: '800 13px/1 var(--tar-text)' }}
            >
              {submitting ? '...' : labels.finish}
            </button>
          </form>
        )}
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
      className="w-full flex items-center gap-3 transition active:scale-[0.99]"
      style={{
        padding: 16,
        borderRadius: 'var(--tar-r-lg)',
        background: active ? `${accent}1F` : 'var(--tar-card)',
        border: active ? `1px solid ${accent}55` : '1px solid var(--tar-line)',
        boxShadow: active ? `0 6px 18px ${accent}1A` : undefined,
      }}
    >
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${accent}24`,
          color: accent,
          border: `1px solid ${accent}44`,
        }}
      >
        {icon}
      </div>
      <div className="text-left flex-1 min-w-0">
        <div
          style={{
            font: '700 14px/1.2 var(--tar-text)',
            color: 'var(--tar-ink)',
          }}
        >
          {title}
        </div>
        <div
          className="mt-1"
          style={{
            font: '500 11px/1.35 var(--tar-mono)',
            letterSpacing: '0.04em',
            color: 'var(--tar-ink-mute)',
          }}
        >
          {sub}
        </div>
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
        <h2
          style={{
            font: '800 20px/1.1 var(--tar-tight)',
            letterSpacing: '-0.02em',
            color: 'var(--tar-ink)',
          }}
        >
          {labels.goalTitle}
        </h2>
        <p
          className="mt-2"
          style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-mute)' }}
        >
          {labels.goalSub}
        </p>
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
        <h2
          style={{
            font: '800 20px/1.1 var(--tar-tight)',
            letterSpacing: '-0.02em',
            color: 'var(--tar-ink)',
          }}
        >
          {labels.locTitle}
        </h2>
        <p
          className="mt-2"
          style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-mute)' }}
        >
          {labels.locSub}
        </p>
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
          className="mx-auto flex items-center justify-center mb-3"
          style={{
            height: 56,
            width: 56,
            borderRadius: 16,
            background: 'var(--tar-brand-grad-soft)',
            border: '1px solid rgba(255, 182, 39, 0.36)',
            color: 'var(--tar-brand-2)',
          }}
        >
          <Bell className="h-6 w-6" />
        </div>
        <h2
          style={{
            font: '800 20px/1.1 var(--tar-tight)',
            letterSpacing: '-0.02em',
            color: 'var(--tar-ink)',
          }}
        >
          {labels.notifTitle}
        </h2>
        <p
          className="mt-2"
          style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-mute)' }}
        >
          {labels.notifSub}
        </p>
      </div>

      {state === 'idle' && (
        <button
          type="button"
          onClick={onEnable}
          className="w-full flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{
            height: 48,
            borderRadius: 14,
            background: 'var(--tar-brand-grad-soft)',
            color: 'var(--tar-brand-2)',
            border: '1px solid rgba(255, 182, 39, 0.36)',
            font: '800 13px/1 var(--tar-text)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Bell className="h-4 w-4" />
          {labels.notifEnable}
        </button>
      )}

      {state === 'on' && (
        <div
          className="text-center"
          style={{
            padding: 12,
            borderRadius: 'var(--tar-r-md)',
            background: 'rgba(43, 216, 132, 0.10)',
            border: '1px solid rgba(43, 216, 132, 0.32)',
            color: 'var(--tar-success)',
            font: '700 13px/1.2 var(--tar-text)',
          }}
        >
          ✓ {labels.notifEnabled}
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
        <h2
          style={{
            font: '800 20px/1.1 var(--tar-tight)',
            letterSpacing: '-0.02em',
            color: 'var(--tar-ink)',
          }}
        >
          {labels.daysTitle}
        </h2>
        <p
          className="mt-2"
          style={{ font: '500 13px/1.4 var(--tar-text)', color: 'var(--tar-ink-mute)' }}
        >
          {labels.daysSub}
        </p>
      </div>

      <div
        className="text-center relative overflow-hidden"
        style={{
          padding: 24,
          borderRadius: 'var(--tar-r-xl)',
          background:
            'radial-gradient(120% 80% at 0% 0%, rgba(255,182,39,0.10), transparent 60%), var(--tar-bg-elevated)',
          border: '1px solid var(--tar-line)',
        }}
      >
        <p
          className="tabular-nums"
          style={{
            font: '900 80px/0.95 var(--tar-tight)',
            letterSpacing: '-0.04em',
            background: 'var(--tar-brand-grad)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 6px 20px rgba(255,182,39,0.28))',
          }}
        >
          {value}
        </p>
        <div className="tar-d-eyebrow" style={{ marginTop: 8 }}>
          {labels.daysSuffix}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="transition"
              style={{
                height: 44,
                borderRadius: 12,
                background: active ? 'var(--tar-brand-grad-soft)' : 'var(--tar-card)',
                color: active ? 'var(--tar-brand-2)' : 'var(--tar-ink-dim)',
                border: active ? '1px solid rgba(255, 182, 39, 0.42)' : '1px solid var(--tar-line)',
                font: '800 14px/1 var(--tar-tight)',
                gridColumn: n === 7 ? 'span 2' : 'span 1',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
