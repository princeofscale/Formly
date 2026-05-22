import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { ensureFriendCode, getFriendsWithStats } from '@/lib/db/friends'
import { MyCodeCard } from '@/components/friends/MyCodeCard'
import { AddFriendForm } from '@/components/friends/AddFriendForm'
import { FriendList } from '@/components/friends/FriendList'

export default async function FriendsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('friends')

  const [myCode, friends] = await Promise.all([
    ensureFriendCode(supabase),
    getFriendsWithStats(supabase, 7),
  ])

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <h1 className="text-[28px] font-bold tracking-tight">{t('title')}</h1>

      <MyCodeCard code={myCode ?? '······'} />

      <AddFriendForm />

      <h2 className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {t('listTitle', { n: friends.length })}
      </h2>

      <FriendList friends={friends} myUserId={user.id} />
    </div>
  )
}
