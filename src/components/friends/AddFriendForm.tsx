'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, Check } from 'lucide-react'
import { addFriendAction, type AddFriendResult } from '@/app/(app)/friends/actions'

export function AddFriendForm() {
  const t = useTranslations('friends')
  const [code, setCode] = useState('')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AddFriendResult | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await addFriendAction(formData)
      setResult(res)
      if (res.ok) setCode('')
      setTimeout(() => setResult(null), 2500)
    })
  }

  return (
    <form onSubmit={onSubmit} className="tar-pg-card space-y-3">
      <div className="tar-d-eyebrow">{t('addLabel')}</div>
      <div className="flex items-center gap-2">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABCD12"
          maxLength={6}
          className="flex-1 outline-none uppercase"
          style={{
            background: 'var(--tar-card)',
            border: '1px solid var(--tar-line)',
            borderRadius: 14,
            padding: '10px 14px',
            font: '800 18px/1 var(--tar-tight)',
            letterSpacing: '0.18em',
            color: 'var(--tar-ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="tar-c-start"
          style={{
            height: 44,
            width: 'auto',
            padding: '0 18px',
            font: '800 13px/1 var(--tar-text)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {pending ? (
            '...'
          ) : result?.ok ? (
            <Check className="h-4 w-4" />
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              {t('add')}
            </>
          )}
        </button>
      </div>
      {result && !result.ok && result.errorKey && (
        <p className="text-xs" style={{ color: 'var(--tar-danger)' }}>
          {t(`addError.${result.errorKey}`)}
        </p>
      )}
      {result?.ok && (
        <p className="text-xs" style={{ color: 'var(--tar-success)' }}>
          {t('addSuccess')}
        </p>
      )}
    </form>
  )
}
