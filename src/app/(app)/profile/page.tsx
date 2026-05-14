// src/app/(app)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getTranslations, getLocale } from 'next-intl/server'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
import { updateProfileAction } from './actions'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { LanguageSelector } from '@/components/profile/LanguageSelector'
import { signOutAction } from '@/app/(app)/actions'
import type { Profile } from '@/lib/types/models'
import Link from 'next/link'
import { Trophy, ChevronRight, Activity } from 'lucide-react'
import { getAchievements } from '@/lib/db/achievements'
import { ALL_ACHIEVEMENT_CODES } from '@/lib/services/achievements.service'

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('profile')
  const tAch = await getTranslations('achievements')
  const tBody = await getTranslations('body')
  const locale = await getLocale()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null

  const unlockedAchievements = await getAchievements(supabase, user.id)
  const unlockedCount = unlockedAchievements.length
  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null
  const trainingAge = p?.training_since
    ? Math.round((Date.now() - new Date(p.training_since).getTime()) / (365.25 * 24 * 3600 * 1000) * 10) / 10
    : null

  const dayKeys = ['1','2','3','4','5','6','7'] as const

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>

      <ProfileAvatar email={user.email ?? ''} />

      {/* Стат-полоса */}
      <div className="grid grid-cols-3 rounded-sm overflow-hidden border border-white/10">
        <div className="flex flex-col items-center justify-center py-3 bg-white/5">
          <span className="font-mono text-xl font-bold">{bmi ? bmi.toFixed(1) : '—'}</span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.bmi')}</span>
          {bmiCat && <span className="text-xs text-zinc-600">{t(`bmiCat.${bmiCat.toLowerCase()}`)}</span>}
        </div>
        <div className="flex flex-col items-center justify-center py-3 bg-white/5 border-x border-white/10">
          <span className="font-mono text-xl font-bold">{trainingAge ? `${trainingAge}y` : '—'}</span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.trainingAge')}</span>
        </div>
        <div className="flex flex-col items-center justify-center py-3 bg-white/5">
          <span className="font-mono text-xl font-bold">
            {p?.training_location ? t(`locationDisplay.${p.training_location}`) : '—'}
          </span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.location')}</span>
        </div>
      </div>

      {/* Форма редактирования */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider font-bold">
            {t('form.editProfile')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('form.weight')}</Label>
                <Input name="weight_kg" type="number" step="0.1"
                  defaultValue={p?.weight_kg ?? ''}
                  className="mt-1 bg-white/5 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.height')}</Label>
                <Input name="height_cm" type="number" step="0.1"
                  defaultValue={p?.height_cm ?? ''}
                  className="mt-1 bg-white/5 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.age')}</Label>
                <Input name="age" type="number"
                  defaultValue={p?.age ?? ''}
                  className="mt-1 bg-white/5 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.trainingSince')}</Label>
                <Input name="training_since" type="date"
                  defaultValue={p?.training_since ?? ''}
                  className="mt-1 bg-white/5 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
            </div>

            <div>
              <Label>{t('form.location')}</Label>
              <select
                name="training_location"
                className="w-full mt-1 bg-white/5 border border-zinc-700 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              <div className="flex gap-2 mt-2 flex-wrap">
                {dayKeys.map(d => (
                  <label key={d} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="training_schedule"
                      value={d}
                      defaultChecked={(p?.training_schedule ?? []).includes(Number(d))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-10 flex items-center justify-center rounded-sm border border-zinc-700 peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-black text-xs font-bold transition-colors">
                      {t(`days.${d}`)}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sync current locale to Supabase on profile save */}
            <input type="hidden" name="locale" value={locale} />

            <Button
              type="submit"
              className="w-full uppercase tracking-wider font-bold h-11"
            >
              {t('form.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Переключатель языка */}
      <Card>
        <CardContent className="pt-4">
          <LanguageSelector current={locale} label={t('language')} />
        </CardContent>
      </Card>

      {/* Body Measurements link */}
      <Link
        href="/body"
        className="flex items-center justify-between p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-500" />
          <div>
            <div className="font-bold text-sm">{tBody('linkTitle')}</div>
            <div className="text-xs text-zinc-500">{tBody('linkSub')}</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-500" />
      </Link>

      {/* Achievements link */}
      <Link
        href="/profile/achievements"
        className="flex items-center justify-between p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <div>
            <div className="font-bold text-sm">{tAch('achievementsLink')}</div>
            <div className="text-xs text-zinc-500">
              {unlockedCount} / {ALL_ACHIEVEMENT_CODES.length}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-500" />
      </Link>

      {/* Опасная зона */}
      <div className="border-t border-white/10 pt-4 flex gap-3">
        <form action={signOutAction} className="flex-1">
          <Button variant="ghost" type="submit" className="w-full uppercase tracking-wider text-sm">
            {t('signOut')}
          </Button>
        </form>
        <Button variant="destructive" className="flex-1 uppercase tracking-wider text-sm" disabled>
          {t('deleteAccount')}
        </Button>
      </div>
    </div>
  )
}
