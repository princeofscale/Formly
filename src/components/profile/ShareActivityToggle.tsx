// src/components/profile/ShareActivityToggle.tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Share2 } from 'lucide-react'
import { setShareActivityAction } from '@/app/(app)/friends/activity-actions'

interface Props {
  initialOn: boolean
}

export function ShareActivityToggle({ initialOn }: Props) {
  const t = useTranslations('profile')
  const [on, setOn] = useState(initialOn)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (pending) return
    const next = !on
    const formData = new FormData()
    formData.set('on', next ? 'true' : 'false')
    startTransition(async () => {
      await setShareActivityAction(formData)
      setOn(next)
    })
  }

  return (
    <div className="tar-pr-pref">
      <div className="tar-pr-pref-row">
        <div className="ic">
          <Share2 />
        </div>
        <div className="meta">
          <div className="t">{t('shareActivity')}</div>
          <div className="s">{t('shareActivitySub')}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t('shareActivity')}
          disabled={pending}
          onClick={toggle}
          className={`tar-s-switch${on ? ' on' : ''}`}
          style={{ opacity: pending ? 0.6 : 1 }}
        />
      </div>
    </div>
  )
}
