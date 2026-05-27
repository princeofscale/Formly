import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { getTemplates } from '@/lib/db/templates'
import { startWorkoutAction, startFromTemplateAction, deleteTemplateAction } from './actions'
import { PresetPrograms } from '@/components/workout/PresetPrograms'
import { AIProgramGenerator } from '@/components/workout/AIProgramGenerator'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Trash2, Bike, Play, Clock, Plus, Repeat } from 'lucide-react'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('workout')
  const tTpl = await getTranslations('templates')
  const tCardio = await getTranslations('cardio')
  const locale = await getLocale()
  const [active, templates, { data: profile }] = await Promise.all([
    getActiveSession(supabase, user.id),
    getTemplates(supabase, user.id),
    supabase.from('profiles').select('training_location').eq('id', user.id).maybeSingle(),
  ])

  const defaultLocation: 'gym' | 'home_dumbbells' | 'home_bodyweight' =
    profile?.training_location === 'home' ? 'home_dumbbells' : 'gym'

  return (
    <div className="space-y-3 pb-4">
      {/* Page title eyebrow */}
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('newTitle')}</div>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('startNewWorkout')}
        </h1>
      </div>

      {active && (
        <Link
          href={`/workout/${active.id}`}
          className="tar-d-rise tar-d-rise-2 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-4 text-amber-200 transition hover:bg-amber-500/[0.12]"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-sm font-bold">{t('activeSession')}</div>
              <div className="text-[11px] uppercase tracking-widest text-amber-200/70">
                {t('resumeWorkout')}
              </div>
            </div>
          </div>
          <Play className="h-5 w-5" />
        </Link>
      )}

      {/* AI generator with rotating gradient stroke */}
      <div className="tar-pl-ai tar-d-rise tar-d-rise-2">
        <AIProgramGenerator defaultLocation={defaultLocation} />
      </div>

      <div className="tar-d-rise tar-d-rise-3">
        <PresetPrograms />
      </div>

      {/* Saved templates */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-4">
        {tTpl('title')}
        {templates.length > 0 ? (
          <span className="counter">
            {tTpl('exercises', {
              n: templates.reduce((sum, tpl) => sum + tpl.exercises.length, 0),
            })}
          </span>
        ) : null}
      </div>

      {templates.length > 0 ? (
        <div className="flex flex-col gap-2 tar-d-rise tar-d-rise-4">
          {templates.map((tpl) => {
            const exerciseNames = tpl.exercises
              .slice(0, 4)
              .map((e) => (locale === 'ru' ? (e.name_ru ?? e.name) : e.name))
              .join(' · ')
            const overflow = tpl.exercises.length > 4 ? ` +${tpl.exercises.length - 4}` : ''

            return (
              <div key={tpl.id} className="tar-pl-tcard">
                <div className="top">
                  <div className="min-w-0 flex-1">
                    <div className="e">{tTpl('exercises', { n: tpl.exercises.length })}</div>
                    <div className="t">{tpl.name}</div>
                    <div className="mt-2 truncate text-[11px] text-white/45">
                      {exerciseNames}
                      {overflow}
                    </div>
                  </div>
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="templateId" value={tpl.id} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/5 hover:text-red-400"
                      title={tTpl('delete')}
                      aria-label={tTpl('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
                <div className="foot">
                  <span className="last">
                    {tpl.exercises.length} {tTpl('start').toLowerCase()}
                  </span>
                  <form action={startFromTemplateAction}>
                    <input type="hidden" name="templateId" value={tpl.id} />
                    <button type="submit" className="go">
                      {tTpl('start')}
                      <Play className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="tar-pl-empty tar-d-rise tar-d-rise-4">
          <div className="plus">
            <Plus />
          </div>
          <div className="t">{tTpl('noTemplates')}</div>
          <div className="s">{t('createTemplateHint')}</div>
        </div>
      )}

      {/* Quick start */}
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-5">{t('quickStart')}</div>
      <div className="tar-pl-quick tar-d-rise tar-d-rise-5">
        <form action={startWorkoutAction}>
          <button type="submit" className="tar-pl-qbtn w-full text-left">
            <div className="ico">
              <Repeat />
            </div>
            <div className="t">{t('emptySession')}</div>
            <div className="s">{t('emptySessionSub')}</div>
          </button>
        </form>
        <Link href="/cardio/new" className="tar-pl-qbtn">
          <div className="ico" style={{ color: '#5EEAD4' }}>
            <Bike />
          </div>
          <div className="t">{tCardio('startCardio')}</div>
          <div className="s">{t('cardioSub')}</div>
        </Link>
      </div>
    </div>
  )
}
