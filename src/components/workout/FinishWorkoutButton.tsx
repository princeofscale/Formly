'use client'

import { useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { finishWorkoutAction } from '@/app/(app)/workout/[id]/actions'

interface Props {
  sessionId: string
}

export function FinishWorkoutButton({ sessionId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleFinish() {
    startTransition(async () => {
      await finishWorkoutAction(sessionId)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFinish}
      disabled={isPending}
      className="border-green-700 text-green-400 hover:bg-green-900"
    >
      <CheckCircle className="h-4 w-4 mr-1" />
      {isPending ? 'Finishing...' : 'Finish'}
    </Button>
  )
}
