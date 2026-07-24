import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getFriendsWithStats } from '@/lib/db/friends'
import { getThread, markThreadRead } from '@/lib/db/messages'
import { ChatThread } from '@/components/friends/ChatThread'

export default async function ChatPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('friends')

  // getFriendsWithStats already excludes blocked pairs — a missing friend here
  // means "not connected", so bounce back to the list.
  const friends = await getFriendsWithStats(supabase, 7)
  const friend = friends.find((f) => f.friend_id === friendId)
  if (!friend) redirect('/friends')

  const name = friend.display_name?.trim() || friend.friend_code || t('anonymous')
  const initial = await getThread(supabase, friendId)
  await markThreadRead(supabase, friendId)

  return (
    <div className="tar-chat">
      <Link href="/friends" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>
      <h1 className="tar-chat-h tar-d-rise tar-d-rise-1">{name}</h1>
      <ChatThread friendId={friendId} friendName={name} myUserId={user.id} initial={initial} />
    </div>
  )
}
