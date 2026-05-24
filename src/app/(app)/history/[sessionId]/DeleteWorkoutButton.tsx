'use client'

import { useState, useTransition } from 'react'
import { deleteSessionAction } from '../actions'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  sessionId: string
  labels: {
    deleteWorkout: string
    deleteConfirmText: string
    deleteConfirm: string
    deleteCancel: string
  }
}

export function DeleteWorkoutButton({ sessionId, labels }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
        <span className="text-sm text-red-400">{labels.deleteConfirmText}</span>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => deleteSessionAction(sessionId))}
        >
          {labels.deleteConfirm}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>
          {labels.deleteCancel}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {labels.deleteWorkout}
    </Button>
  )
}
