import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startWorkoutAction } from './actions'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('workout')
  const active = await getActiveSession(supabase, user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('newTitle')}</h1>

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

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <form action={startWorkoutAction}>
            <button
              type="submit"
              className={buttonVariants({ size: 'lg', className: 'w-full' })}
            >
              {t('startNewWorkout')}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
