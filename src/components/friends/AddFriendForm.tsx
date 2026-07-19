'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
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
    <form onSubmit={onSubmit}>
      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3">{t('addLabel')}</div>
      <div className="tar-fr-add tar-d-rise tar-d-rise-3">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="XXXXXX"
          maxLength={6}
          aria-label={t('addLabel')}
        />
        <button type="submit" disabled={pending || code.length !== 6} className="tar-cta">
          {pending ? '...' : result?.ok ? <Check className="i" /> : t('add')}
        </button>
      </div>
      {result && !result.ok && result.errorKey && (
        <p className="mt-2 text-xs" style={{ color: 'var(--tar-danger)' }}>
          {t(`addError.${result.errorKey}`)}
        </p>
      )}
      {result?.ok && (
        <p className="mt-2 text-xs" style={{ color: 'var(--tar-success)' }}>
          {t('addSuccess')}
        </p>
      )}
    </form>
  )
}
