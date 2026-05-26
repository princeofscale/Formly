'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, CheckIcon } from '@/components/auth/icons'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const [linkExpired] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('error') === 'link_expired'
  })
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)

  const t = useTranslations('auth.login')
  const tf = useTranslations('auth.fields')
  const te = useTranslations()

  const errorMsg = state?.errorKey ? te(state.errorKey) : null

  return (
    <form
      action={formAction}
      noValidate
      className="w-full max-w-sm tar-stagger"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div>
        <span className="tar-h-eyebrow">{t('eyebrow')}</span>
        <h1 className="tar-h" style={{ fontSize: 36 }}>
          {t('title')}
        </h1>
        <p className="tar-sub">{t('subtitle')}</p>
      </div>

      <div style={{ marginTop: 6 }}>
        <FloatingInput
          name="email"
          autoComplete="email"
          label={tf('email')}
          icon={MailIcon}
          type="email"
          required
          error={errorMsg}
        />
        <FloatingInput
          name="password"
          autoComplete="current-password"
          label={tf('password')}
          icon={LockIcon}
          type={showPw ? 'text' : 'password'}
          required
          isPassword
          capsLockLabel={tf('capsLock')}
          rightAction={{
            icon: showPw ? (
              <EyeOffIcon style={{ width: 18, height: 18 }} />
            ) : (
              <EyeIcon style={{ width: 18, height: 18 }} />
            ),
            onClick: () => setShowPw((s) => !s),
            ariaLabel: showPw ? tf('hidePassword') : tf('showPassword'),
          }}
        />
      </div>

      <div className="tar-row">
        <label
          className={'tar-check-row ' + (remember ? 'on' : '')}
          onClick={() => setRemember((r) => !r)}
        >
          <span className="tar-check-box">
            <CheckIcon style={{ width: 11, height: 11, color: '#0A0A0F' }} />
          </span>
          <span className="tar-check-text">{t('remember')}</span>
        </label>
        <Link href="/forgot-password" className="tar-link">
          {t('forgotLink')}
        </Link>
      </div>

      {linkExpired && !errorMsg && (
        <p
          className="text-sm animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ color: 'var(--tar-brand-2)' }}
        >
          {te('auth.reset.linkExpired')}
        </p>
      )}

      <SubmitButton pending={pending}>{t('submit')}</SubmitButton>

      <div
        style={{
          textAlign: 'center',
          marginTop: 14,
          color: 'var(--tar-ink-dim)',
          fontSize: 13,
        }}
      >
        {t('noAccount')}{' '}
        <Link
          href="/register"
          className="tar-link accent"
          style={{ display: 'inline', padding: 0 }}
        >
          {t('registerLink')}
        </Link>
      </div>
    </form>
  )
}
