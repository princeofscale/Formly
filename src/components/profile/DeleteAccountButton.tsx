'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, ShieldAlert, X, ChevronRight } from 'lucide-react'
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
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="del"
          style={{ flex: 1 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            {t('deleteAccountConfirm')}
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={isPending}
          aria-label={t('deleteAccountCancel')}
          style={{ width: 44, flex: '0 0 auto', justifyContent: 'center' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={handleClick} className="del">
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldAlert className="h-4 w-4" />
        {t('deleteAccount')}
      </span>
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
