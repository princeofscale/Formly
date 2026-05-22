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
      className="rounded-2xl p-5"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(255, 196, 68, 0.10), transparent 55%), #15151C',
        border: '1px solid rgba(255, 196, 68, 0.22)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC044' }}>
        {t('label')}
      </p>
      <p className="text-sm text-white/55 mt-1">{t('subtitle')}</p>

      <div className="mt-4 flex items-center justify-center">
        <p
          className="font-mono font-extrabold text-5xl tabular-nums tracking-[0.18em]"
          style={{ color: '#FFC044', textShadow: '0 6px 24px rgba(255,196,68,0.32)' }}
        >
          {code}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition"
          style={{
            background: 'rgba(255, 196, 68, 0.10)',
            color: '#FFC044',
            border: '1px solid rgba(255, 196, 68, 0.28)',
          }}
        >
          {copied ? <><Check className="h-4 w-4" />{t('copied')}</> : <><Copy className="h-4 w-4" />{t('copy')}</>}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Share2 className="h-4 w-4" />
          {t('share')}
        </button>
      </div>
    </div>
  )
}
