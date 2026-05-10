import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import Link from 'next/link'
import type { MuscleGroup, Equipment } from '@/lib/types/models'

const MUSCLES: MuscleGroup[] = ['chest', 'back', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts']
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string; equipment?: string }>
}) {
  const { muscle, equipment } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const exercises = await getExercises(supabase, user.id, {
    muscle: muscle as MuscleGroup | undefined,
    equipment: equipment as Equipment | undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <ExerciseForm />
      </div>

      <div className="flex flex-wrap gap-2">
        {MUSCLES.map(m => (
          <Link key={m} href={`/exercise-library?muscle=${m}${equipment ? `&equipment=${equipment}` : ''}`}>
            <Badge variant={muscle === m ? 'default' : 'outline'} className="cursor-pointer capitalize">{m.replace('_', ' ')}</Badge>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map(e => (
          <Link key={e} href={`/exercise-library?${muscle ? `muscle=${muscle}&` : ''}equipment=${e}`}>
            <Badge variant={equipment === e ? 'default' : 'outline'} className="cursor-pointer capitalize">{e}</Badge>
          </Link>
        ))}
        {(muscle || equipment) && (
          <Link href="/exercise-library">
            <Badge variant="destructive" className="cursor-pointer">Clear</Badge>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {exercises.map(ex => (
          <Card key={ex.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{ex.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{ex.primary_muscle} · {ex.equipment} · {ex.mechanic}</p>
              </div>
              {ex.is_custom && (
                <Badge variant="outline" className="text-xs">Custom</Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {exercises.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No exercises found.</p>
        )}
      </div>
    </div>
  )
}
