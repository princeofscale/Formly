'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetAction } from './actions'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null)
  const t = useTranslations('auth.forgot')
  const tf = useTranslations('auth.fields')
  const te = useTranslations()

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-wider">{t('title')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      {state?.ok ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-200/90">{t('sent')}</p>
          </div>
          <Link
            href="/login"
            className="block text-center text-sm text-amber-500 hover:text-amber-400 font-medium"
          >
            {t('backToLogin')}
          </Link>
        </div>
      ) : (
        <>
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
            {state && 'errorKey' in state && state.errorKey && (
              <p className="text-sm text-red-400">{te(state.errorKey)}</p>
            )}
            <Button
              type="submit"
              disabled={pending}
              className="w-full h-12 uppercase tracking-wider font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 border-0"
            >
              {pending ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
              {t('backToLogin')}
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
