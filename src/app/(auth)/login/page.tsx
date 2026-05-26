'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Dumbbell } from 'lucide-react'
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

  const heroDelay = { animationDelay: '60ms', animationFillMode: 'both' as const }
  const formDelay = { animationDelay: '200ms', animationFillMode: 'both' as const }
  const footerDelay = { animationDelay: '340ms', animationFillMode: 'both' as const }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={heroDelay}>
        <h1 className="text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-white to-amber-200 bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      <form
        action={formAction}
        className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
        style={formDelay}
      >
        <div className="space-y-2">
          <Label htmlFor="email">{tf('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 focus-visible:border-amber-500/40 h-11 backdrop-blur-sm transition-colors"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 focus-visible:border-amber-500/40 h-11 backdrop-blur-sm transition-colors"
          />
        </div>
        {state?.errorKey && (
          <p className="text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {te(state.errorKey)}
          </p>
        )}
        {linkExpired && !state?.errorKey && (
          <p className="text-sm text-amber-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {te('auth.reset.linkExpired')}
          </p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-black border-0 shadow-[0_8px_24px_rgba(255,196,68,0.25)] transition-[background-position] duration-500 active:scale-[0.98]"
          disabled={pending}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Dumbbell className="auth-curl-icon h-4 w-4" />
              {t('submitting')}
            </span>
          ) : (
            t('submit')
          )}
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

      <p
        className="text-center text-sm text-zinc-400 animate-in fade-in duration-500"
        style={footerDelay}
      >
        {t('noAccount')}{' '}
        <Link href="/register" className="text-amber-500 hover:text-amber-400 font-medium">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  )
}
