import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const { user } = await verifySession()

  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, started_at, total_volume_kg')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/workout/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Start Workout
        </Link>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Recent Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <ul className="space-y-2">
              {sessions.map(s => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span>{new Date(s.started_at).toLocaleDateString()}</span>
                  <span className="text-zinc-400">{(s.total_volume_kg ?? 0).toFixed(0)} kg total</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">No workouts yet. Start your first session!</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Muscle Activity (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Log workouts to see your muscle heatmap here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
