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
      setTimeout(() => setCopied(false), 1400)
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
    <div className="tar-fr-code tar-d-rise tar-d-rise-2">
      <div className="tar-d-eyebrow accent">{t('label')}</div>
      <div className="tar-fr-code-sub">{t('subtitle')}</div>
      <strong className="tar-fr-code-val tar-grad-text tabular-nums">{code}</strong>
      <div className="tar-fr-code-btns">
        <button type="button" onClick={copy} className={`tar-fr-cbtn${copied ? ' ok' : ''}`}>
          {copied ? <Check className="i" /> : <Copy className="i" />}
          <span className="lbl">{copied ? t('copied') : t('copy')}</span>
        </button>
        <button type="button" onClick={share} className="tar-fr-cbtn ghost">
          <Share2 className="i" />
          <span className="lbl">{t('share')}</span>
        </button>
      </div>
    </div>
  )
}
