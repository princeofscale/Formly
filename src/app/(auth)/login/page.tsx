'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  // Lazy init reads window.location on the client; server render gets false,
  // and React hydrates with the right value on first paint.
  const [linkExpired] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('error') === 'link_expired'
  })
  const t = useTranslations('auth.login')
  const tf = useTranslations('auth.fields')
  const te = useTranslations()

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-wider">{t('title')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tf('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        {state?.errorKey && <p className="text-sm text-red-400">{te(state.errorKey)}</p>}
        {linkExpired && !state?.errorKey && (
          <p className="text-sm text-amber-400">{te('auth.reset.linkExpired')}</p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 border-0"
          disabled={pending}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-400 hover:text-amber-400 transition-colors"
          >
            {t('forgotLink')}
          </Link>
        </div>
      </form>

      <p className="text-center text-sm text-zinc-400">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-amber-500 hover:text-amber-400 font-medium">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  )
}
