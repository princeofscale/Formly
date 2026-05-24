// src/app/(app)/profile/page.tsx
import { getLocale, getTranslations } from 'next-intl/server'
import {
  ChevronRight,
  Download,
  Dumbbell,
  LogOut,
  MapPin,
  Ruler,
  Scale,
  UserRound,
} from 'lucide-react'
import { signOutAction } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSelector } from '@/components/profile/LanguageSelector'
import { NotificationsToggle } from '@/components/profile/NotificationsToggle'
import { DeleteAccountButton } from '@/components/profile/DeleteAccountButton'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/models'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
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

function displayMetric(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '—'
  return `${value}${suffix}`
}

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('profile')
  const locale = await getLocale()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const p = profile as Profile | null

  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null
  const trainingAge = formatTrainingAge(p?.training_since, {
    lessThanYear: t('stats.lessThanYear'),
    yearShort: t('stats.yearShort'),
  })
  const dayKeys = ['1', '2', '3', '4', '5', '6', '7'] as const
  const initials = (user.email ?? 'GL').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-4 pb-4 sm:space-y-5">
      {/* HERO — matches dashboard: bg-card + gradient blobs, primary-tinted
          avatar instead of the old amber→red gradient. */}
      <section className="relative overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-white/[0.06] sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/25">
              <span className="font-mono text-xl font-black text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                {t('overview')}
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-wider sm:text-4xl">
                {t('title')}
              </h1>
              <p className="truncate text-sm text-zinc-400">{user.email}</p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[360px]">
            <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
              <Scale className="mb-2 h-4 w-4 text-primary" />
              <p className="font-mono text-lg font-black">
                {displayMetric(p?.weight_kg, ` ${t('stats.weightUnit')}`)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                {t('form.weight')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
              <Ruler className="mb-2 h-4 w-4 text-amber-300" />
              <p className="font-mono text-lg font-black">
                {displayMetric(p?.height_cm, ` ${t('stats.heightUnit')}`)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                {t('form.height')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
              <Dumbbell className="mb-2 h-4 w-4 text-primary" />
              <p className="font-mono text-lg font-black">{trainingAge ?? '—'}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                {t('stats.trainingAge')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('stats.bmi')}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="font-mono text-3xl font-black text-white">
              {bmi ? bmi.toFixed(1) : '—'}
            </span>
            {bmiCat && (
              <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-bold uppercase text-zinc-300">
                {t(`bmiCat.${bmiCat.toLowerCase()}`)}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('stats.location')}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-xl font-black">
              {p?.training_location ? t(`locationDisplay.${p.training_location}`) : '—'}
            </span>
          </div>
        </div>
        <div className="rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('form.schedule')}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dayKeys.map((d) => {
              const active = (p?.training_schedule ?? []).includes(Number(d))
              return (
                <span
                  key={d}
                  className={
                    active
                      ? 'flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary px-2 text-[10px] font-black text-white'
                      : 'flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/5 px-2 text-[10px] font-bold text-zinc-600'
                  }
                >
                  {t(`days.${d}`)}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <Card className="bg-card ring-1 ring-white/[0.06] border-0">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <UserRound className="h-4 w-4 text-primary" />
            {t('form.editProfile')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('form.weight')}</Label>
                <Input
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  defaultValue={p?.weight_kg ?? ''}
                  className="mt-1 h-11 bg-black/20 border-white/10 focus-visible:ring-red-500"
                />
              </div>
              <div>
                <Label>{t('form.height')}</Label>
                <Input
                  name="height_cm"
                  type="number"
                  step="0.1"
                  defaultValue={p?.height_cm ?? ''}
                  className="mt-1 h-11 bg-black/20 border-white/10 focus-visible:ring-red-500"
                />
              </div>
              <div>
                <Label>{t('form.age')}</Label>
                <Input
                  name="age"
                  type="number"
                  defaultValue={p?.age ?? ''}
                  className="mt-1 h-11 bg-black/20 border-white/10 focus-visible:ring-red-500"
                />
              </div>
              <div>
                <Label>{t('form.trainingSince')}</Label>
                <Input
                  name="training_since"
                  type="date"
                  defaultValue={p?.training_since ?? ''}
                  className="mt-1 h-11 bg-black/20 border-white/10 focus-visible:ring-red-500"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_1fr]">
              <div>
                <Label>{t('form.location')}</Label>
                <select
                  name="training_location"
                  className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition-colors focus:ring-2 focus:ring-red-500"
                  defaultValue={p?.training_location ?? ''}
                >
                  <option value="">{t('form.locationSelect')}</option>
                  <option value="gym">{t('form.locationGym')}</option>
                  <option value="home">{t('form.locationHome')}</option>
                  <option value="both">{t('form.locationBoth')}</option>
                </select>
              </div>

              <div>
                <Label>{t('form.schedule')}</Label>
                <div className="mt-1 grid grid-cols-7 gap-1.5">
                  {dayKeys.map((d) => (
                    <label key={d} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="training_schedule"
                        value={d}
                        defaultChecked={(p?.training_schedule ?? []).includes(Number(d))}
                        className="sr-only peer"
                      />
                      <div className="flex h-11 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-[11px] font-black text-zinc-500 transition-colors peer-checked:border-red-500 peer-checked:bg-red-500 peer-checked:text-white">
                        {t(`days.${d}`)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <input type="hidden" name="locale" value={locale} />

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-red-500 text-sm font-black uppercase tracking-wider text-white hover:bg-red-400"
            >
              {t('form.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-card ring-1 ring-white/[0.06] border-0">
          <CardContent className="pt-4">
            <LanguageSelector current={locale} label={t('language')} />
          </CardContent>
        </Card>
        <NotificationsToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      </section>

      <a
        href="/api/export/csv"
        download
        className="flex items-center justify-between rounded-[24px] bg-card p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-black">{t('exportCsv')}</div>
            <div className="text-xs text-zinc-500">{t('exportCsvSub')}</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-500" />
      </a>

      <section className="flex flex-col gap-3 rounded-[24px] bg-card p-3 ring-1 ring-white/[0.06] sm:flex-row">
        <form action={signOutAction} className="flex-1">
          <Button
            variant="ghost"
            type="submit"
            className="h-10 w-full justify-center gap-2 rounded-xl text-sm uppercase tracking-wider"
          >
            <LogOut className="h-4 w-4" />
            {t('signOut')}
          </Button>
        </form>
        <DeleteAccountButton />
      </section>
    </div>
  )
}
