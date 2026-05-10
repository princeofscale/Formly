import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getActiveSession } from '@/lib/db/workouts'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startWorkoutAction } from './actions'
import Link from 'next/link'

export default async function NewWorkoutPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const active = await getActiveSession(supabase, user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Start Workout</h1>

      {active && (
        <Card className="bg-zinc-900 border-amber-800">
          <CardHeader>
            <CardTitle className="text-base text-amber-400">Active Session</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href={`/workout/${active.id}`} className={buttonVariants()}>
              Resume Workout
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
              Start New Workout
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
