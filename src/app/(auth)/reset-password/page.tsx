'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { LockIcon, ShieldIcon, EyeIcon, EyeOffIcon } from '@/components/auth/icons'
import { setNewPasswordAction } from './actions'

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, null)
  const [showPw, setShowPw] = useState(false)
  const [pw, setPw] = useState('')
  const t = useTranslations('auth.reset')
  const te = useTranslations()
  const tf = useTranslations('auth.fields')

  const errorMsg = state?.errorKey ? te(state.errorKey) : null
  const pwErr = state?.errorKey === 'auth.reset.tooShort' ? errorMsg : null
  const confirmErr = state?.errorKey === 'auth.reset.mismatch' ? errorMsg : null

  return (
    <form
      action={formAction}
      noValidate
      className="w-full max-w-sm tar-stagger"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div>
        <span className="tar-h-eyebrow">{t('eyebrow')}</span>
        <h1 className="tar-h" style={{ fontSize: 34 }}>
          {t('title')}
        </h1>
        <p className="tar-sub">{t('subtitle')}</p>
      </div>

      <div style={{ marginTop: 6 }}>
        <FloatingInput
          name="password"
          autoComplete="new-password"
          label={t('newPassword')}
          icon={LockIcon}
          type={showPw ? 'text' : 'password'}
          required
          isPassword
          capsLockLabel={tf('capsLock')}
          error={pwErr}
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
        <FloatingInput
          name="confirm"
          autoComplete="new-password"
          label={t('confirmPassword')}
          icon={ShieldIcon}
          type={showPw ? 'text' : 'password'}
          required
          isPassword
          capsLockLabel={tf('capsLock')}
          error={confirmErr}
        />
      </div>

      {errorMsg && state?.errorKey === 'auth.reset.linkExpired' && (
        <p className="text-sm" style={{ color: 'var(--tar-danger)' }}>
          {errorMsg}
        </p>
      )}

      <SubmitButton pending={pending}>{t('submit')}</SubmitButton>
    </form>
  )
}
