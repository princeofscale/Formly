import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { ensureFriendCode, getFriendsWithStats, getPendingFriendRequests } from '@/lib/db/friends'
import { getFriendsRecentPRs } from '@/lib/db/prs'
import { MyCodeCard } from '@/components/friends/MyCodeCard'
import { AddFriendForm } from '@/components/friends/AddFriendForm'
import { FriendList } from '@/components/friends/FriendList'
import { FriendRequestList } from '@/components/friends/FriendRequestList'
import { FriendsPrFeed } from '@/components/friends/FriendsPrFeed'

export default async function FriendsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('friends')

  const [myCode, friends, pending, friendPRs] = await Promise.all([
    ensureFriendCode(supabase),
    getFriendsWithStats(supabase, 7),
    getPendingFriendRequests(supabase),
    getFriendsRecentPRs(supabase, 14),
  ])

  return (
    <div className="tar-fr">
      <Link href="/dashboard" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>

      <h1 className="tar-fr-h tar-d-rise tar-d-rise-1">{t('title')}</h1>

      <MyCodeCard code={myCode ?? '······'} />

      <AddFriendForm />

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-4">
        {t('requestsTitle')}
        {pending.length > 0 && ` · ${pending.length}`}
      </div>
      {pending.length > 0 ? (
        <FriendRequestList requests={pending} />
      ) : (
        <div className="tar-fr-empty tar-d-rise tar-d-rise-4">
          <div className="t">{t('requestsEmpty')}</div>
          <div className="s">{t('requestsEmptySub')}</div>
        </div>
      )}

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-5">
        {t('prFeedTitle')}
        {friendPRs.length > 0 && ` · ${friendPRs.length}`}
      </div>
      {friendPRs.length > 0 ? (
        <FriendsPrFeed prs={friendPRs} />
      ) : (
        <div className="tar-fr-empty tar-d-rise tar-d-rise-5">
          <div className="t">{t('prsEmpty')}</div>
          <div className="s">{t('prsEmptySub')}</div>
        </div>
      )}

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-6">
        {t('listTitle')}
        {friends.length > 0 && ` · ${friends.length}`}
      </div>
      <FriendList friends={friends} myUserId={user.id} />
    </div>
  )
}
