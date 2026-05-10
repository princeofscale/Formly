import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExerciseWithSets } from '@/lib/types/models'

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ finished?: string }>
}) {
  const { sessionId } = await params
  const { finished } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) notFound()

  const sets = await getSetsForSession(supabase, sessionId)
  const allExercises = await getExercises(supabase, user.id)

  const exerciseMap = new Map<string, ExerciseWithSets>()
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      const ex = allExercises.find(e => e.id === set.exercise_id)
      if (ex) exerciseMap.set(set.exercise_id, { ...ex, sets: [] })
    }
    exerciseMap.get(set.exercise_id)?.sets.push(set)
  }

  const exercises = Array.from(exerciseMap.values())
  const date = new Date(session.started_at)
  const duration = session.finished_at
    ? Math.round((new Date(session.finished_at).getTime() - date.getTime()) / 60000)
    : null

  return (
    <div className="space-y-6">
      {finished === '1' && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-green-400 text-sm font-medium">
          Workout complete! Great work 💪
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">
          {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-zinc-400 text-sm">
          {(session.total_volume_kg ?? 0).toFixed(0)}kg total volume
          {duration ? ` · ${duration} minutes` : ''}
        </p>
      </div>

      {exercises.map(ex => (
        <Card key={ex.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{ex.name}</CardTitle>
            <p className="text-xs text-zinc-500 capitalize">{ex.primary_muscle}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left pb-1">Set</th>
                  <th className="text-left pb-1">Weight</th>
                  <th className="text-left pb-1">Reps</th>
                  <th className="text-left pb-1">e1RM</th>
                  <th className="text-left pb-1">RPE</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map(s => (
                  <tr key={s.id} className="border-t border-zinc-800">
                    <td className="py-1 text-zinc-500">#{s.set_number}</td>
                    <td className="py-1">{s.weight_kg}kg</td>
                    <td className="py-1">{s.reps}</td>
                    <td className="py-1 text-zinc-400">{s.calculated_1rm?.toFixed(1) ?? '—'}</td>
                    <td className="py-1 text-zinc-400">{s.rpe ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {exercises.length === 0 && (
        <p className="text-zinc-500 text-center py-8">No exercises logged in this session.</p>
      )}
    </div>
  )
}
