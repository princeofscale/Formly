'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Hand,
  Home,
  Trophy,
} from 'lucide-react'
import { finishOnboardingAction, skipOnboardingAction } from '@/app/onboarding/actions'
import { subscribeToPushAction } from '@/app/(app)/profile/push-actions'
import { requestPushSubscription } from '@/lib/utils/push-subscribe'

type Goal = 'strength' | 'hypertrophy' | 'general'
type Location = 'gym' | 'home_dumbbells' | 'home_bodyweight'
type NotifState = 'idle' | 'on' | 'denied' | 'unsupported' | 'no-key' | 'error'

const TOTAL_STEPS = 4
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

const BURST: Array<{ dx: string; dy: string; delay: string }> = [
  { dx: '-92px', dy: '-64px', delay: '.15s' },
  { dx: '88px', dy: '-78px', delay: '.22s' },
  { dx: '-58px', dy: '-110px', delay: '.3s' },
  { dx: '120px', dy: '-30px', delay: '.26s' },
  { dx: '-126px', dy: '-6px', delay: '.34s' },
  { dx: '52px', dy: '-122px', delay: '.4s' },
  { dx: '104px', dy: '-96px', delay: '.45s' },
  { dx: '-30px', dy: '-134px', delay: '.5s' },
]

export function OnboardingWizard({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const t = useTranslations('onboarding')
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal>('hypertrophy')
  const [location, setLocation] = useState<Location>('gym')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [submitting, setSubmitting] = useState(false)
  const [notifState, setNotifState] = useState<NotifState>('idle')
  const [notifDiagnostic, setNotifDiagnostic] = useState<string | null>(null)
  const [, startNotif] = useTransition()

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

  function toggleDay(n: number) {
    setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort((a, b) => a - b)))
  }

  const goalLabel = {
    strength: t('goalStrength'),
    hypertrophy: t('goalHypertrophy'),
    general: t('goalGeneral'),
  }[goal]
  const locLabel = {
    gym: t('locGym'),
    home_dumbbells: t('locDumbbells'),
    home_bodyweight: t('locBodyweight'),
  }[location]

  // Final celebrate view lives past the counted steps
  if (step === TOTAL_STEPS) {
    return (
      <div className="tar-ob">
        <div className="tar-ob-fin">
          <div className="tar-ob-burst" aria-hidden="true">
            {BURST.map((b, i) => (
              <i
                key={i}
                style={
                  { '--dx': b.dx, '--dy': b.dy, animationDelay: b.delay } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="tar-ob-ring">
            <Check className="i" strokeWidth={2.5} />
          </div>
          <h2 className="tar-ob-fin-h tar-d-rise tar-d-rise-2">
            {t('finTitle')} <span className="tar-grad-text">{t('finTitleAccent')}</span>
          </h2>
          <p className="tar-ob-fin-sub tar-d-rise tar-d-rise-3">{t('finSub')}</p>
          <div className="tar-ob-chips tar-d-rise tar-d-rise-4">
            <span className="tar-ob-chip">
              <Dumbbell className="i" />
              {goalLabel}
            </span>
            <span className="tar-ob-chip">
              <Building2 className="i" />
              {locLabel}
            </span>
            <span className="tar-ob-chip">
              <Calendar className="i" />
              {days.map((n) => t(`day${n}`)).join(' · ')}
            </span>
            {notifState === 'on' && (
              <span className="tar-ob-chip">
                <Bell className="i" />
                {t('finPushOn')}
              </span>
            )}
          </div>
        </div>
        <form
          action={finishOnboardingAction}
          onSubmit={() => setSubmitting(true)}
          className="tar-ob-footer"
          style={{ flexDirection: 'column' }}
        >
          <input type="hidden" name="goal" value={goal} />
          <input type="hidden" name="location" value={location} />
          <input type="hidden" name="days" value={days.length} />
          <input type="hidden" name="schedule" value={days.join(',')} />
          <button type="submit" disabled={submitting} className="tar-cta" style={{ width: '100%' }}>
            {submitting ? '...' : t('finStart')}
            <ChevronRight className="i" style={{ width: 16, height: 16 }} />
          </button>
          <button
            type="submit"
            name="dest"
            value="profile"
            disabled={submitting}
            className="tar-ob-skip"
            style={{ alignSelf: 'center', padding: 10 }}
          >
            {t('finProfile')}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="tar-ob">
      <div className="tar-ob-top tar-d-rise tar-d-rise-1">
        <span className="tar-ob-step">{t('step', { n: step + 1, total: TOTAL_STEPS })}</span>
        <form action={skipOnboardingAction}>
          <button type="submit" className="tar-ob-skip">
            {t('skip')}
          </button>
        </form>
      </div>
      <div className="tar-ob-bar tar-d-rise tar-d-rise-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`tar-ob-seg${i <= step ? ' on' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <StepHead title={t('goalTitle')} sub={t('goalSub')} />
          <div className="tar-ob-opts tar-d-rise tar-d-rise-3">
            <OptionCard
              active={goal === 'strength'}
              icon={<Trophy className="i" />}
              title={t('goalStrength')}
              sub={t('goalStrengthSub')}
              onClick={() => setGoal('strength')}
            />
            <OptionCard
              active={goal === 'hypertrophy'}
              icon={<Dumbbell className="i" />}
              title={t('goalHypertrophy')}
              sub={t('goalHypertrophySub')}
              onClick={() => setGoal('hypertrophy')}
            />
            <OptionCard
              active={goal === 'general'}
              icon={<Activity className="i" />}
              title={t('goalGeneral')}
              sub={t('goalGeneralSub')}
              onClick={() => setGoal('general')}
            />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <StepHead title={t('locTitle')} sub={t('locSub')} />
          <div className="tar-ob-opts tar-d-rise tar-d-rise-3">
            <OptionCard
              active={location === 'gym'}
              icon={<Building2 className="i" />}
              title={t('locGym')}
              sub={t('locGymSub')}
              onClick={() => setLocation('gym')}
            />
            <OptionCard
              active={location === 'home_dumbbells'}
              icon={<Home className="i" />}
              title={t('locDumbbells')}
              sub={t('locDumbbellsSub')}
              onClick={() => setLocation('home_dumbbells')}
            />
            <OptionCard
              active={location === 'home_bodyweight'}
              icon={<Hand className="i" />}
              title={t('locBodyweight')}
              sub={t('locBodyweightSub')}
              onClick={() => setLocation('home_bodyweight')}
            />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <StepHead title={t('daysTitle')} sub={t('daysSub')} />
          <div className="tar-ob-daysum tar-d-rise tar-d-rise-3">
            <div className="n tar-grad-text tar-ob-daycount tabular-nums">{days.length}</div>
            <div className="tar-d-eyebrow">{t('daysCount', { n: days.length })}</div>
          </div>
          <div className="tar-ob-days tar-d-rise tar-d-rise-4">
            {ISO_DAYS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => toggleDay(n)}
                className={`tar-ob-day${days.includes(n) ? ' on' : ''}`}
                aria-pressed={days.includes(n)}
              >
                {t(`day${n}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="tar-ob-head tar-d-rise tar-d-rise-2">
            <div className="tar-ob-belltile">
              <Bell className="i" />
            </div>
            <h2 className="tar-ob-h">{t('notifTitle')}</h2>
            <p className="tar-ob-sub">{t('notifSub')}</p>
          </div>
          <div className="tar-ob-push tar-d-rise tar-d-rise-3">
            <span className="app">
              <Dumbbell className="i" strokeWidth={2.5} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row1">
                <span className="an">Formly</span>
                <span className="tm">{t('pushNow')}</span>
              </div>
              <div className="bt">{t('pushTitle')}</div>
              <div className="bs">{t('pushBody')}</div>
            </div>
          </div>

          {notifState === 'idle' && (
            <button
              type="button"
              onClick={enableNotifications}
              className="tar-cta tar-d-rise tar-d-rise-4"
              style={{ width: '100%' }}
            >
              <Bell className="i" style={{ width: 16, height: 16 }} />
              {t('notifEnable')}
            </button>
          )}
          {notifState === 'on' && (
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
              ✓ {t('notifEnabled')}
            </div>
          )}
          {notifState === 'denied' && <NotifBox text={t('notifDenied')} />}
          {notifState === 'unsupported' && (
            <NotifBox
              text={t('notifUnsupported')}
              diagnostic={notifDiagnostic ? `reason: ${notifDiagnostic}` : null}
            />
          )}
          {notifState === 'no-key' && (
            <NotifBox text="Сервер не настроен (VAPID-ключ отсутствует) — это не твой браузер, это сайт." />
          )}
          {notifState === 'error' && (
            <div
              className="text-center space-y-1"
              style={{
                padding: 12,
                borderRadius: 'var(--tar-r-md)',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.20)',
              }}
            >
              <p className="text-xs text-red-300/80">Ошибка подключения уведомлений</p>
              {notifDiagnostic && (
                <p className="text-[10px] font-mono text-white/45 break-all">{notifDiagnostic}</p>
              )}
            </div>
          )}
          <p className="tar-ob-note">{t('notifLater')}</p>
        </>
      )}

      <div className="tar-ob-footer tar-d-rise tar-d-rise-5">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="tar-cta-ghost">
            <ChevronLeft className="i" style={{ width: 16, height: 16 }} />
            {t('back')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          disabled={step === 2 && days.length === 0}
          className="tar-cta"
        >
          {step === TOTAL_STEPS - 1 ? t('finish') : t('next')}
          <ChevronRight className="i" style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  )
}

function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="tar-ob-head tar-d-rise tar-d-rise-2">
      <h2 className="tar-ob-h">{title}</h2>
      <p className="tar-ob-sub">{sub}</p>
    </div>
  )
}

function OptionCard({
  active,
  icon,
  title,
  sub,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`tar-ob-opt${active ? ' on' : ''}`}>
      <span className="ico">{icon}</span>
      <span className="tx">
        <span className="t">{title}</span>
        <span className="s">{sub}</span>
      </span>
      <span className="tick">
        <Check className="i" strokeWidth={3} />
      </span>
    </button>
  )
}

function NotifBox({ text, diagnostic }: { text: string; diagnostic?: string | null }) {
  return (
    <div
      className="rounded-xl p-3 text-center space-y-1"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-xs text-white/55">{text}</p>
      {diagnostic && <p className="text-[10px] font-mono text-white/35">{diagnostic}</p>}
    </div>
  )
}
