// src/app/(auth)/register/page.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from './actions'

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null)
  const t = useTranslations('auth.register')
  const tf = useTranslations('auth.fields')

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
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={tf('passwordPlaceholder')}
            required
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm"
          disabled={pending}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        {t('hasAccount')}{' '}
        <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  )
}
