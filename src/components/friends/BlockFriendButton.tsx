'use client'

import { useEffect, useState, useTransition } from 'react'
import { Ban } from 'lucide-react'
import { blockUserAction } from '@/app/(app)/friends/activity-actions'

interface Props {
  targetId: string
  label: string
  confirmLabel: string
}

// Two-tap hard-block: first tap arms the control (shows the confirm label),
// second tap actually submits. Auto-disarms after a few seconds so a stray
// row doesn't stay "armed" indefinitely.
export function BlockFriendButton({ targetId, label, confirmLabel }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  function onClick() {
    if (pending) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    const formData = new FormData()
    formData.set('targetId', targetId)
    startTransition(async () => {
      await blockUserAction(formData)
      setConfirming(false)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={confirming ? confirmLabel : label}
      title={confirming ? confirmLabel : label}
      className="block transition-colors hover:text-red-400"
      data-confirming={confirming || undefined}
    >
      <Ban className="i" style={{ width: 14, height: 14 }} />
      {confirming && <span>{confirmLabel}</span>}
    </button>
  )
}
