import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
import { updateProfileAction } from './actions'
import type { Profile } from '@/lib/types/models'

const DAYS = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 },
]

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null

  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null

  const trainingAge = p?.training_since
    ? Math.round((Date.now() - new Date(p.training_since).getTime()) / (365.25 * 24 * 3600 * 1000) * 10) / 10
    : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">BMI</p>
            <p className="text-2xl font-bold">{bmi ? bmi.toFixed(1) : '—'}</p>
            {bmiCat && <p className="text-xs text-zinc-400">{bmiCat}</p>}
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Training Age</p>
            <p className="text-2xl font-bold">{trainingAge ? `${trainingAge}y` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Edit Profile</CardTitle></CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight (kg)</Label>
                <Input name="weight_kg" type="number" step="0.1" defaultValue={p?.weight_kg ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input name="height_cm" type="number" step="0.1" defaultValue={p?.height_cm ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Age</Label>
                <Input name="age" type="number" defaultValue={p?.age ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
              <div>
                <Label>Training since</Label>
                <Input name="training_since" type="date" defaultValue={p?.training_since ?? ''} className="mt-1 bg-zinc-800 border-zinc-700" />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <select name="training_location" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm" defaultValue={p?.training_location ?? ''}>
                <option value="">Select...</option>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <Label>Training days</Label>
              <div className="flex gap-2 mt-2">
                {DAYS.map(d => (
                  <label key={d.value} className="flex flex-col items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      name="training_schedule"
                      value={d.value}
                      defaultChecked={(p?.training_schedule ?? []).includes(d.value)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-700 peer-checked:bg-blue-600 peer-checked:border-blue-600 text-xs font-medium">
                      {d.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">Save Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <p className="text-sm text-zinc-400">Email: {user.email}</p>
        </CardContent>
      </Card>
    </div>
  )
}
