// src/app/(app)/profile/page.tsx
import { getLocale, getTranslations } from 'next-intl/server'
import { ChevronRight, Download, Flame, LogOut, Mail, Ruler, Scale, UserRound } from 'lucide-react'
import { signOutAction } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSelector } from '@/components/profile/LanguageSelector'
import { NotificationsToggle } from '@/components/profile/NotificationsToggle'
import { DeleteAccountButton } from '@/components/profile/DeleteAccountButton'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/models'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
import { getFinishedSessionDates } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import { updateProfileAction } from './actions'

function formatTrainingAge(
  trainingSince: string | null | undefined,
  labels: { lessThanYear: string; yearShort: string },
) {
  if (!trainingSince) return null

  const startedAt = new Date(`${trainingSince}T00:00:00.000Z`)
  if (Number.isNaN(startedAt.getTime())) return null

  const now = new Date()
  let years = now.getUTCFullYear() - startedAt.getUTCFullYear()
  const hadAnniversary =
    now.getUTCMonth() > startedAt.getUTCMonth() ||
    (now.getUTCMonth() === startedAt.getUTCMonth() && now.getUTCDate() >= startedAt.getUTCDate())

  if (!hadAnniversary) years -= 1
  years = Math.max(0, years)

  if (years === 0) return labels.lessThanYear
  return `${years} ${labels.yearShort}`
}

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('profile')
  const locale = await getLocale()

  const [profileRes, lifetimeStats, workoutDates] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('workout_sessions')
      .select('total_volume_kg', { count: 'exact' })
      .eq('user_id', user.id)
      .not('finished_at', 'is', null),
    getFinishedSessionDates(supabase, user.id),
  ])

  const p = profileRes.data as Profile | null
  const totalWorkouts = lifetimeStats.count ?? 0
  const totalTonnage = (lifetimeStats.data ?? []).reduce(
    (s, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0),
    0,
  )
  const schedule = (p?.training_schedule as number[] | null) ?? []
  const streakInfo = calculateStreak(workoutDates, schedule, new Date(), 2)
  const longestStreak = streakInfo.longest

  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null
  const trainingAge = formatTrainingAge(p?.training_since, {
    lessThanYear: t('stats.lessThanYear'),
    yearShort: t('stats.yearShort'),
  })
  const dayKeys = ['1', '2', '3', '4', '5', '6', '7'] as const
  const initials = (user.email ?? 'GL').slice(0, 2).toUpperCase()

  // Derive a friendly name from email prefix
  const emailPrefix = (user.email ?? '').split('@')[0] ?? ''
  const cleanName = emailPrefix.replace(/[._-]/g, ' ').trim()
  const displayName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Athlete'

  const tonnageDisplay = Math.round(totalTonnage).toLocaleString(
    locale === 'ru' ? 'ru-RU' : 'en-US',
  )

  return (
    <div className="space-y-3 pb-4">
      {/* Hero: avatar + name + streak */}
      <div className="tar-pr-hero tar-d-rise tar-d-rise-1">
        <div className="tar-pr-av">{initials}</div>
        <div className="who">
          <div className="e">{t('overview')}</div>
          <div className="n">{displayName}</div>
          <div className="h">
            <Flame />
            <span>
              <span className="tabular-nums">{streakInfo.current}</span> {t('streakUnit')}
            </span>
          </div>
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="tar-pr-stats tar-d-rise tar-d-rise-2">
        <div className="tar-pr-stat">
          <div className="v">{totalWorkouts}</div>
          <div className="k">{t('lifetime.workouts')}</div>
        </div>
        <div className="tar-pr-stat">
          <div className="v gold">{tonnageDisplay}</div>
          <div className="k">{t('lifetime.tonnage')}</div>
        </div>
        <div className="tar-pr-stat">
          <div className="v">{longestStreak}</div>
          <div className="k">{t('lifetime.longest')}</div>
        </div>
      </div>

      {/* Identity (read-only display + Edit form below) */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3" style={{ marginLeft: 4 }}>
        {t('sectionIdentity')}
      </div>
      <div className="flex flex-col gap-1.5 tar-d-rise tar-d-rise-3">
        <div className="tar-pr-field">
          <div className="l">
            <Mail />
            {t('emailLabel')}
          </div>
          <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{user.email}</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--tar-success)',
                boxShadow: '0 0 6px var(--tar-success)',
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Edit form — wrapped in tar-pr-field style cards */}
      <form action={updateProfileAction} className="flex flex-col gap-1.5 tar-d-rise tar-d-rise-3">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="tar-pr-field">
            <Label className="l flex items-center gap-1.5">
              <Scale />
              {t('form.weight')}
            </Label>
            <Input
              name="weight_kg"
              type="number"
              step="0.1"
              defaultValue={p?.weight_kg ?? ''}
              placeholder="—"
              className="bg-transparent border-0 px-0 h-auto text-base font-semibold focus-visible:ring-0"
              style={{ fontFamily: 'var(--tar-mono)', letterSpacing: '0.02em' }}
            />
          </div>
          <div className="tar-pr-field">
            <Label className="l flex items-center gap-1.5">
              <Ruler />
              {t('form.height')}
            </Label>
            <Input
              name="height_cm"
              type="number"
              step="0.1"
              defaultValue={p?.height_cm ?? ''}
              placeholder="—"
              className="bg-transparent border-0 px-0 h-auto text-base font-semibold focus-visible:ring-0"
              style={{ fontFamily: 'var(--tar-mono)', letterSpacing: '0.02em' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="tar-pr-field">
            <Label className="l flex items-center gap-1.5">
              <UserRound />
              {t('form.age')}
            </Label>
            <Input
              name="age"
              type="number"
              defaultValue={p?.age ?? ''}
              placeholder="—"
              className="bg-transparent border-0 px-0 h-auto text-base font-semibold focus-visible:ring-0"
              style={{ fontFamily: 'var(--tar-mono)', letterSpacing: '0.02em' }}
            />
          </div>
          <div className="tar-pr-field">
            <Label className="l">{t('form.trainingSince')}</Label>
            <Input
              name="training_since"
              type="date"
              defaultValue={p?.training_since ?? ''}
              className="bg-transparent border-0 px-0 h-auto text-sm focus-visible:ring-0"
              style={{ fontFamily: 'var(--tar-mono)', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* BMI display + location + schedule */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="tar-pr-field">
            <div className="l">{t('stats.bmi')}</div>
            <div
              className="v mono"
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}
            >
              <span style={{ fontSize: 18, fontWeight: 700 }}>{bmi ? bmi.toFixed(1) : '—'}</span>
              {bmiCat && (
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: 'var(--tar-ink-mute)',
                    textTransform: 'uppercase',
                  }}
                >
                  {t(`bmiCat.${bmiCat.toLowerCase()}`)}
                </span>
              )}
            </div>
          </div>
          <div className="tar-pr-field">
            <Label htmlFor="loc" className="l">
              {t('form.location')}
            </Label>
            <select
              id="loc"
              name="training_location"
              defaultValue={p?.training_location ?? ''}
              className="bg-transparent border-0 outline-none w-full text-base font-semibold mt-1"
              style={{ color: 'var(--tar-ink)' }}
            >
              <option value="">{t('form.locationSelect')}</option>
              <option value="gym">{t('form.locationGym')}</option>
              <option value="home">{t('form.locationHome')}</option>
              <option value="both">{t('form.locationBoth')}</option>
            </select>
          </div>
        </div>

        <div className="tar-pr-field">
          <Label className="l">{t('form.schedule')}</Label>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {dayKeys.map((d) => (
              <label key={d}>
                <input
                  type="checkbox"
                  name="training_schedule"
                  value={d}
                  defaultChecked={(p?.training_schedule ?? []).includes(Number(d))}
                  className="tar-pr-day-input sr-only"
                />
                <div className="tar-pr-day-cell">{t(`days.${d}`)}</div>
              </label>
            ))}
          </div>
        </div>

        {trainingAge && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 4,
              fontFamily: 'var(--tar-mono)',
              fontSize: 11,
              color: 'var(--tar-ink-mute)',
              letterSpacing: '0.1em',
            }}
          >
            {t('stats.trainingAge').toUpperCase()} · {trainingAge}
          </div>
        )}

        <input type="hidden" name="locale" value={locale} />

        <Button
          type="submit"
          className="mt-3 h-12 w-full rounded-xl text-sm font-bold tracking-wide"
          style={{
            background: 'var(--tar-brand-grad)',
            color: '#1a0f08',
            boxShadow: 'var(--tar-brand-glow)',
          }}
        >
          {t('form.save')}
        </Button>
      </form>

      {/* Preferences */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-4" style={{ marginLeft: 4 }}>
        {t('sectionPreferences')}
      </div>
      <div
        className="tar-d-rise tar-d-rise-4"
        style={{
          background: 'var(--tar-card)',
          border: '1px solid var(--tar-line)',
          borderRadius: 'var(--tar-r-md)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <LanguageSelector current={locale} label={t('language')} />
        <NotificationsToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      </div>

      {/* Export CSV */}
      <a
        href="/api/export/csv"
        download
        className="tar-pl-qbtn tar-d-rise tar-d-rise-5"
        style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ico" style={{ marginBottom: 0 }}>
            <Download />
          </div>
          <div>
            <div className="t">{t('exportCsv')}</div>
            <div className="s" style={{ marginTop: 4 }}>
              {t('exportCsvSub')}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-white/40" />
      </a>

      {/* Danger zone */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-6" style={{ marginLeft: 4 }}>
        {t('sectionAccount')}
      </div>
      <div className="tar-pr-danger tar-d-rise tar-d-rise-6">
        <form action={signOutAction}>
          <button type="submit">
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogOut className="h-4 w-4" />
              {t('signOut')}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
        <DeleteAccountButton />
      </div>
    </div>
  )
}
