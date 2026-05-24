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
    <form
      onSubmit={onSubmit}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {t('addLabel')}
      </p>
      <div className="flex items-center gap-2">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABCD12"
          maxLength={6}
          className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2.5 text-base font-mono font-bold tabular-nums tracking-widest text-white outline-none ring-1 ring-white/10 placeholder:text-white/20 focus:ring-white/30 uppercase"
        />
        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="h-11 px-4 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(255,59,71,0.26)] transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
        <p className="text-xs" style={{ color: '#FF6E76' }}>
          {t(`addError.${result.errorKey}`)}
        </p>
      )}
      {result?.ok && (
        <p className="text-xs" style={{ color: '#22D3A8' }}>
          {t('addSuccess')}
        </p>
      )}
    </form>
  )
}
