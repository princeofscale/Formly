import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getCoachThread } from '@/lib/db/coach'
import { CoachThread } from '@/components/coach/CoachThread'

/** Every reply in the thread is a server action waiting on the model. */
export const maxDuration = 60

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { user } = await verifySession()
  const supabase = await createClient()
  const { q } = await searchParams
  const t = await getTranslations('coach')

  const messages = await getCoachThread(supabase, user.id)

  return (
    <div className="tar-chat-wrap">
      <Link href="/dashboard" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>
      <h1 className="tar-chat-h tar-d-rise tar-d-rise-1">{t('title')}</h1>
      <CoachThread initial={messages} prefill={(q ?? '').slice(0, 1000)} />
    </div>
  )
}
