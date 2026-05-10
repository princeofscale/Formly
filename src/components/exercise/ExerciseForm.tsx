'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExerciseAction } from '@/app/(app)/exercise-library/actions'

const MUSCLES = ['chest','back','biceps','triceps','forearms','core','quads','hamstrings','glutes','calves','traps','lats','rear_delts','front_delts','side_delts']
const EQUIPMENT = ['barbell','dumbbell','machine','cable','bodyweight','other']

export function ExerciseForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1" /> Add Custom
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Create Custom Exercise</h2>
        <form
          action={async (fd) => {
            await createExerciseAction(fd)
            setOpen(false)
          }}
          className="space-y-4"
        >
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="Exercise name" className="mt-1 bg-zinc-800 border-zinc-700" required />
          </div>
          <div>
            <Label>Primary Muscle</Label>
            <select name="primary_muscle" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm" required>
              {MUSCLES.map(m => (
                <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Mechanic</Label>
            <select name="mechanic" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm">
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
            </select>
          </div>
          <div>
            <Label>Equipment</Label>
            <select name="equipment" className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm">
              {EQUIPMENT.map(e => (
                <option key={e} value={e} className="capitalize">{e}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Save</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
