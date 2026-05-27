'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Share2 } from 'lucide-react'

interface Props {
  code: string
}

export function MyCodeCard({ code }: Props) {
  const t = useTranslations('friends.myCode')
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  async function share() {
    const message = t('shareMessage', { code })
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ text: message, title: t('shareTitle') })
        return
      } catch {
        // user cancelled — fall through to copy
      }
    }
    copy()
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        padding: 20,
        borderRadius: 'var(--tar-r-xl)',
        background:
          'radial-gradient(120% 80% at 0% 0%, rgba(255, 182, 39, 0.12), transparent 60%), var(--tar-bg-elevated)',
        border: '1px solid rgba(255, 182, 39, 0.28)',
      }}
    >
      <div className="tar-d-eyebrow accent">{t('label')}</div>
      <div
        style={{
          font: '500 13px/1.4 var(--tar-text)',
          color: 'var(--tar-ink-mute)',
          marginTop: 4,
        }}
      >
        {t('subtitle')}
      </div>

      <div className="mt-4 flex items-center justify-center">
        <p
          className="tabular-nums"
          style={{
            font: '900 48px/1 var(--tar-tight)',
            letterSpacing: '0.16em',
            background: 'var(--tar-brand-grad)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 6px 20px rgba(255, 182, 39, 0.32))',
          }}
        >
          {code}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-2 transition"
          style={{
            height: 42,
            borderRadius: 12,
            background: 'var(--tar-brand-grad-soft)',
            color: 'var(--tar-brand-2)',
            border: '1px solid rgba(255, 182, 39, 0.36)',
            font: '700 13px/1 var(--tar-text)',
            letterSpacing: '0.02em',
          }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              {t('copied')}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t('copy')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex-1 flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{
            height: 42,
            borderRadius: 12,
            background: 'var(--tar-card)',
            color: 'var(--tar-ink-dim)',
            border: '1px solid var(--tar-line)',
            font: '700 13px/1 var(--tar-text)',
            letterSpacing: '0.02em',
          }}
        >
          <Share2 className="h-4 w-4" />
          {t('share')}
        </button>
      </div>
    </div>
  )
}
