'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, LogOut } from 'lucide-react'
import { signOutAction } from '@/app/(app)/actions'
import { clearOfflineData } from '@/lib/utils/offline-queue'

export function SignOutButton() {
  const t = useTranslations('profile')
  const [isPending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      await clearOfflineData().catch(() => {})
      navigator.serviceWorker?.controller?.postMessage({ type: 'clear-private-data' })
      await signOutAction()
    })
  }

  return (
    <button type="button" disabled={isPending} onClick={signOut}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogOut className="h-4 w-4" />
        {t('signOut')}
      </span>
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
