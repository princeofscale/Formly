'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setNewPasswordAction } from './actions'

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, null)
  const t = useTranslations('auth.reset')
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
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={tf('passwordPlaceholder')}
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('confirmPassword')}</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        {state?.errorKey && <p className="text-sm text-red-400">{te(state.errorKey)}</p>}
        <Button
          type="submit"
          disabled={pending}
          className="w-full h-12 uppercase tracking-wider font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 border-0"
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  )
}
