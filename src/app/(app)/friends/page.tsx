import Link from 'next/link'
import { ChevronLeft, Crown, Dumbbell, Trophy, Users } from 'lucide-react'
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

  const since7days = new Date()
  since7days.setDate(since7days.getDate() - 7)

  const [myCode, friends, pending, friendPRs, mySessionsResult] = await Promise.all([
    ensureFriendCode(supabase),
    getFriendsWithStats(supabase, 7),
    getPendingFriendRequests(supabase),
    getFriendsRecentPRs(supabase, 14),
    supabase
      .from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .neq('session_type', 'cardio')
      .gte('started_at', since7days.toISOString()),
  ])
  const names = new Map(friends.map((friend) => [friend.friend_id, friend.display_name]))
  const namedFriendPRs = friendPRs.map((pr) => ({
    ...pr,
    display_name: names.get(pr.friend_id) ?? null,
  }))
  const inGym = friends.filter((friend) => friend.is_in_gym).length
  const teamSessions = friends.reduce((sum, friend) => sum + friend.week_sessions, 0)

  // Weekly leaderboard — friends and me, ranked by tonnage.
  const mySessions = mySessionsResult.data ?? []
  const myTonnage = mySessions.reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0)
  const board = [
    ...friends.map((f) => ({
      id: f.friend_id,
      name: f.display_name?.trim() || f.friend_code || t('anonymous'),
      tonnage: f.week_tonnage_kg,
      sessions: f.week_sessions,
      isMe: false,
    })),
    { id: user.id, name: t('you'), tonnage: myTonnage, sessions: mySessions.length, isMe: true },
  ].sort((a, b) => b.tonnage - a.tonnage)
  const hasActivity = board.some((row) => row.tonnage > 0)
  const weekLeader = friends.length > 0 && hasActivity ? board[0] : null

  const rankColors = ['#FFC044', 'rgba(255,255,255,0.65)', '#C08A5A']

  return (
    <div className="tar-fr">
      <Link href="/dashboard" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>

      <h1 className="tar-fr-h tar-d-rise tar-d-rise-1">{t('title')}</h1>

      <section className="tar-d-rise tar-d-rise-2 overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/15 via-white/[0.04] to-transparent p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {t('squad.eyebrow')}
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight">{t('squad.title')}</h2>
          </div>
          <Users className="h-7 w-7 text-primary" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-black/20 p-3">
            <Users className="mb-2 h-4 w-4 text-white/45" />
            <div className="font-mono text-xl font-black tabular-nums">{friends.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/40">
              {t('squad.people')}
            </div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <Dumbbell className="mb-2 h-4 w-4 text-emerald-300" />
            <div className="font-mono text-xl font-black tabular-nums">{teamSessions}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/40">
              {t('squad.sessions')}
            </div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <span className="mb-2 block h-4 text-sm text-emerald-300">●</span>
            <div className="font-mono text-xl font-black tabular-nums">{inGym}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/40">
              {t('squad.inGym')}
            </div>
          </div>
        </div>
        {weekLeader && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-3">
            <Trophy className="h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-200/60">
                {t('squad.leader')}
              </div>
              <div className="truncate text-sm font-bold">{weekLeader.name}</div>
            </div>
            <div className="ml-auto font-mono text-xs font-bold text-amber-200">
              {(weekLeader.tonnage / 1000).toFixed(1)} t
            </div>
          </div>
        )}
      </section>

      {/* Weekly leaderboard */}
      {friends.length > 0 && (
        <>
          <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3">{t('leaderboardTitle')}</div>
          {hasActivity ? (
            <div className="tar-fr-list tar-d-rise tar-d-rise-3">
              {board.map((row, i) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: row.isMe ? 'rgba(255, 182, 39, 0.06)' : 'var(--tar-card)',
                    border: row.isMe
                      ? '1px solid rgba(255, 182, 39, 0.22)'
                      : '1px solid var(--tar-line)',
                  }}
                >
                  <span
                    className="w-6 shrink-0 text-center font-mono text-sm font-black tabular-nums"
                    style={{ color: rankColors[i] ?? 'rgba(255,255,255,0.35)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {row.name}
                    {i === 0 && row.tonnage > 0 && (
                      <Crown
                        className="mb-0.5 ml-1.5 inline h-3.5 w-3.5"
                        style={{ color: '#FFC044' }}
                      />
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/40">
                    {row.sessions} {t('unitSessions')}
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-sm font-bold tabular-nums">
                    {(row.tonnage / 1000).toFixed(1)}
                    <em className="ml-0.5 text-[10px] not-italic text-white/40">{t('unitTons')}</em>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tar-fr-empty tar-d-rise tar-d-rise-3">
              <div className="t">{t('leaderboardEmpty')}</div>
            </div>
          )}
        </>
      )}

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
        <FriendsPrFeed prs={namedFriendPRs} />
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
