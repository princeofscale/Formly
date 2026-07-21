'use client'

import { useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { finishWorkoutAction } from '@/app/(app)/workout/[id]/actions'
import { enqueueFinish } from '@/lib/utils/offline-queue'

interface Props {
  sessionId: string
  /** Called when the finish couldn't reach the server and was queued instead. */
  onQueued?: () => void
}

// Same offline heuristic as SetRow: navigator.onLine is authoritative when
// false; a TypeError mentioning fetch/network catches flaky radio. A server
// action's redirect() is handled by Next internally and never lands here.
function isOfflineError(err: unknown): boolean {
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    (err instanceof TypeError && /fetch|network/i.test(err.message))
  )
}

export function FinishWorkoutButton({ sessionId, onQueued }: Props) {
  const t = useTranslations('workout')
  const [isPending, startTransition] = useTransition()

  function handleFinish() {
    startTransition(async () => {
      try {
        await finishWorkoutAction(sessionId)
      } catch (err) {
        if (!isOfflineError(err)) throw err
        await enqueueFinish(sessionId)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('formly:set-queued'))
        }
        onQueued?.()
      }
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
      {isPending ? t('finishing') : t('finish')}
    </Button>
  )
}
