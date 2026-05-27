'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { MailIcon } from '@/components/auth/icons'
import { requestPasswordResetAction } from './actions'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null)
  const [resendNonce, setResendNonce] = useState(0)
  const t = useTranslations('auth.forgot')
  const tf = useTranslations('auth.fields')
  const te = useTranslations()

  const sent = state && 'ok' in state && state.ok
  const sentEmail = sent && 'email' in state ? state.email : null
  const errorMsg = state && 'errorKey' in state && state.errorKey ? te(state.errorKey) : null

  if (sent) {
    return (
      <div
        key={resendNonce}
        className="w-full max-w-sm tar-stagger"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,182,39,0.18))',
            border: '1px solid rgba(255,182,39,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--tar-brand-2)',
          }}
        >
          <MailIcon style={{ width: 24, height: 24 }} />
        </div>
        <div>
          <span className="tar-h-eyebrow">{t('eyebrow')}</span>
          <h1 className="tar-h" style={{ fontSize: 32 }}>
            {t('sentTitle')}
          </h1>
          <p className="tar-sub">
            {sentEmail
              ? t.rich('sentBodyWithEmail', {
                  email: sentEmail,
                  strong: (chunks) => <strong style={{ color: 'var(--tar-ink)' }}>{chunks}</strong>,
                })
              : t('sentBody')}
          </p>
        </div>
        {sentEmail && (
          <form
            action={async () => {
              const fd = new FormData()
              fd.set('email', sentEmail)
              await requestPasswordResetAction(null, fd)
              setResendNonce((n) => n + 1)
            }}
          >
            <button
              type="submit"
              className="tar-btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('resend')}
            </button>
          </form>
        )}
        <Link href="/login" className="tar-link" style={{ alignSelf: 'center', marginTop: 6 }}>
          {t('backToLogin')}
        </Link>
      </div>
    )
  }

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
          name="email"
          autoComplete="email"
          label={tf('email')}
          icon={MailIcon}
          type="email"
          required
          error={errorMsg}
        />
      </div>

      <SubmitButton pending={pending}>{t('submit')}</SubmitButton>

      <Link href="/login" className="tar-link" style={{ alignSelf: 'center', marginTop: 6 }}>
        {t('backToLogin')}
      </Link>
    </form>
  )
}
