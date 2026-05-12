import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { getTemplates } from '@/lib/db/templates'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startWorkoutAction, startFromTemplateAction, deleteTemplateAction } from './actions'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Trash2 } from 'lucide-react'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('workout')
  const tTpl = await getTranslations('templates')
  const locale = await getLocale()
  const [active, templates] = await Promise.all([
    getActiveSession(supabase, user.id),
    getTemplates(supabase, user.id),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-wider">{t('newTitle')}</h1>

      {active && (
        <Card className="bg-zinc-900 border-amber-800">
          <CardHeader>
            <CardTitle className="text-base text-amber-400">{t('activeSession')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href={`/workout/${active.id}`} className={buttonVariants()}>
              {t('resumeWorkout')}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick start */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <form action={startWorkoutAction}>
            <button type="submit" className={buttonVariants({ size: 'lg', className: 'w-full uppercase tracking-wider font-bold' })}>
              {t('startNewWorkout')}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{tTpl('title')}</h2>
          {templates.map(tpl => {
            const exerciseNames = tpl.exercises
              .slice(0, 4)
              .map(e => (locale === 'ru' ? (e.name_ru ?? e.name) : e.name))
              .join(' · ')
            const overflow = tpl.exercises.length > 4 ? ` +${tpl.exercises.length - 4}` : ''

            return (
              <Card key={tpl.id} className="bg-zinc-900 border-zinc-800">
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
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-sm transition-colors"
                        >
                          {tTpl('start')}
                        </button>
                      </form>
                      <form action={deleteTemplateAction}>
                        <input type="hidden" name="templateId" value={tpl.id} />
                        <button
                          type="submit"
                          className="h-8 w-8 flex items-center justify-center text-zinc-600 hover:text-red-400 rounded-sm hover:bg-zinc-800 transition-colors"
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
        <p className="text-xs text-zinc-600 text-center">{tTpl('noTemplates')}</p>
      )}
    </div>
  )
}
