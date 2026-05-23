'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteAccountAction } from '@/app/(app)/actions'

export function DeleteAccountButton() {
  const t = useTranslations('profile')
  const [armed, setArmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!armed) {
      setArmed(true)
      return
    }
    startTransition(() => deleteAccountAction())
  }

  if (armed) {
    return (
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="destructive"
          onClick={handleClick}
          disabled={isPending}
          className="h-10 flex-1 justify-center gap-2 rounded-xl text-sm uppercase tracking-wider"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          {t('deleteAccountConfirm')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setArmed(false)}
          disabled={isPending}
          className="h-10 rounded-xl px-3"
          aria-label={t('deleteAccountCancel')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="destructive"
      onClick={handleClick}
      className="h-10 flex-1 justify-center gap-2 rounded-xl text-sm uppercase tracking-wider"
    >
      <ShieldAlert className="h-4 w-4" />
      {t('deleteAccount')}
    </Button>
  )
}
