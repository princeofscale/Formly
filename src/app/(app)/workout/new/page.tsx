import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { getTemplates } from '@/lib/db/templates'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startWorkoutAction, startFromTemplateAction, deleteTemplateAction } from './actions'
import { PresetPrograms } from '@/components/workout/PresetPrograms'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Trash2, Bike, Dumbbell, Play, Clock, Layers, ChevronRight } from 'lucide-react'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('workout')
  const tTpl = await getTranslations('templates')
  const tCardio = await getTranslations('cardio')
  const locale = await getLocale()
  const [active, templates] = await Promise.all([
    getActiveSession(supabase, user.id),
    getTemplates(supabase, user.id),
  ])

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-white/[0.06] sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('newTitle')}
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/25">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-3xl font-black uppercase leading-none tracking-wide text-white sm:text-5xl">
                  {t('startNewWorkout')}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/55">
                    {tTpl('title')}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest text-white/35 tabular-nums">
                    {tTpl('exercises', { n: templates.reduce((sum, tpl) => sum + tpl.exercises.length, 0) })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <form action={startWorkoutAction}>
                <button
                  type="submit"
                  className="flex h-full min-h-24 w-full flex-col justify-between rounded-2xl bg-primary p-4 text-left text-white shadow-[0_14px_30px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Play className="h-5 w-5" />
                  <span className="text-sm font-extrabold uppercase tracking-wide">
                    {t('startNewWorkout')}
                  </span>
                </button>
              </form>

              <Link
                href="/cardio/new"
                className="flex min-h-24 flex-col justify-between rounded-2xl bg-white/[0.04] p-4 text-left ring-1 ring-white/[0.06] transition hover:bg-white/[0.07] active:scale-[0.98]"
              >
                <Bike className="h-5 w-5" style={{ color: '#5EEAD4' }} />
                <span className="text-sm font-extrabold uppercase tracking-wide" style={{ color: '#5EEAD4' }}>
                  {tCardio('startCardio')}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {active && (
        <Card className="border-amber-400/25 bg-amber-500/[0.06]">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base text-amber-300">
              <Clock className="h-4 w-4" />
              {t('activeSession')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href={`/workout/${active.id}`} className={buttonVariants({ className: 'w-full uppercase tracking-wide font-bold' })}>
              {t('resumeWorkout')}
            </Link>
          </CardContent>
        </Card>
      )}

      <PresetPrograms />

      {templates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Layers className="h-4 w-4 text-white/35" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{tTpl('title')}</h2>
          </div>
          {templates.map(tpl => {
            const exerciseNames = tpl.exercises
              .slice(0, 4)
              .map(e => (locale === 'ru' ? (e.name_ru ?? e.name) : e.name))
              .join(' · ')
            const overflow = tpl.exercises.length > 4 ? ` +${tpl.exercises.length - 4}` : ''

            return (
              <Card key={tpl.id} className="transition hover:bg-white/[0.04]">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{tpl.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{exerciseNames}{overflow}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {tTpl('exercises', { n: tpl.exercises.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <form action={startFromTemplateAction}>
                        <input type="hidden" name="templateId" value={tpl.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary/90"
                        >
                          <Play className="h-3 w-3" />
                          {tTpl('start')}
                        </button>
                      </form>
                      <form action={deleteTemplateAction}>
                        <input type="hidden" name="templateId" value={tpl.id} />
                        <button
                          type="submit"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/5 hover:text-red-400"
                          title={tTpl('delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {templates.length === 0 && (
        <div className="rounded-[24px] bg-card p-5 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/45">{tTpl('noTemplates')}</p>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-700" />
          </div>
        </div>
      )}
    </div>
  )
}
