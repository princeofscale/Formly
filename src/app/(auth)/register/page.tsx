'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, CheckIcon } from '@/components/auth/icons'
import { registerAction } from './actions'

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null)
  const [showPw, setShowPw] = useState(false)
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const t = useTranslations('auth.register')
  const tf = useTranslations('auth.fields')
  const te = useTranslations()

  const errorMsg = state?.errorKey ? te(state.errorKey) : null
  const legalError = state?.errorKey === 'auth.errors.legalRequired' ? errorMsg : null

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
          error={legalError ? null : errorMsg}
        />
        <FloatingInput
          name="password"
          autoComplete="new-password"
          label={tf('password')}
          icon={LockIcon}
          type={showPw ? 'text' : 'password'}
          required
          isPassword
          capsLockLabel={tf('capsLock')}
          onValueChange={setPw}
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
        <PasswordStrength value={pw} />
      </div>

      <label
        className={'tar-check-row ' + (agree ? 'on' : '')}
        style={{ marginTop: 4, alignItems: 'flex-start', gap: 12 }}
      >
        <input
          type="checkbox"
          name="agree"
          required
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          aria-invalid={Boolean(legalError)}
          aria-describedby={legalError ? 'legal-error' : undefined}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        />
        <span className="tar-check-box" style={{ marginTop: 1 }}>
          <CheckIcon style={{ width: 11, height: 11, color: '#0A0A0F' }} />
        </span>
        <span className="tar-check-text">
          {t('legalAccept.before')}{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener"
            className="tar-link accent"
            style={{ display: 'inline', padding: 0 }}
          >
            {t('legalAccept.terms')}
          </Link>{' '}
          {t('legalAccept.and')}{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="tar-link accent"
            style={{ display: 'inline', padding: 0 }}
          >
            {t('legalAccept.privacy')}
          </Link>
        </span>
      </label>
      {legalError && (
        <p id="legal-error" className="tar-fielderr" role="alert">
          {legalError}
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
        {t('hasAccount')}{' '}
        <Link href="/login" className="tar-link accent" style={{ display: 'inline', padding: 0 }}>
          {t('loginLink')}
        </Link>
      </div>
    </form>
  )
}
