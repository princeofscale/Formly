'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { deleteMeasurementAction } from '@/app/(app)/body/actions'

interface Props {
  id: string
}

export function DeleteMeasurementButton({ id }: Props) {
  const t = useTranslations('body')
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteMeasurementAction(id)
    })
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-zinc-600 hover:text-red-400 transition-colors"
        title={t('delete')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-zinc-500">{t('deleteConfirm')}</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-400 hover:text-red-300 font-bold uppercase disabled:opacity-50"
      >
        {t('delete')}
      </button>
      <span className="text-zinc-700">/</span>
      <button
        onClick={() => setConfirm(false)}
        className="text-zinc-500 hover:text-zinc-300 uppercase"
      >
        {t('cancel')}
      </button>
    </div>
  )
}
