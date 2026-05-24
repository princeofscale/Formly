'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Flame, Trophy } from 'lucide-react'
import { toggleReactionAction } from '@/app/(app)/friends/actions'
import type { FriendRecentPR } from '@/lib/db/prs'

interface Props {
  prs: FriendRecentPR[]
}

function timeAgoLabel(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86400000)
  if (days <= 0) return locale === 'ru' ? 'сегодня' : 'today'
  if (days === 1) return locale === 'ru' ? 'вчера' : 'yesterday'
  return locale === 'ru' ? `${days}д назад` : `${days}d ago`
}

export function FriendsPrFeed({ prs }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()

  if (prs.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        <Trophy className="h-3 w-3" style={{ color: '#FFC044' }} />
        {t('prFeedTitle', { n: prs.length })}
      </h2>
      <div className="rounded-[24px] bg-card p-2 ring-1 ring-white/[0.06]">
        <div className="space-y-1">
          {prs.map((pr) => {
            const name =
              locale === 'ru' ? (pr.exercise_name_ru ?? pr.exercise_name) : pr.exercise_name
            const e1rm = Math.round(pr.current_best)
            const delta =
              pr.improvement_pct != null ? `+${pr.improvement_pct.toFixed(1)}%` : t('firstRecord')
            return (
              <div
                key={pr.pr_set_id}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <div
                  className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-mono font-extrabold text-[11px]"
                  style={{ background: 'rgba(167, 139, 250, 0.16)', color: '#A78BFA' }}
                >
                  {(pr.friend_code ?? '??').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white/65 tabular-nums">
                      {pr.friend_code ?? '······'}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {timeAgoLabel(pr.achieved_at, locale)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-bold text-white">{name}</p>
                  <p className="mt-0.5 text-[11px] text-white/45 tabular-nums">
                    {pr.weight_kg}кг × {pr.reps} · e1ПМ {e1rm}{' '}
                    <span style={{ color: '#22D3A8' }}>{delta}</span>
                  </p>
                </div>
                <ReactionButton
                  prSetId={pr.pr_set_id}
                  didReact={pr.did_react}
                  count={pr.reaction_count}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReactionButton({
  prSetId,
  didReact,
  count,
}: {
  prSetId: string
  didReact: boolean
  count: number
}) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('friends')

  function handle() {
    const fd = new FormData()
    fd.set('prSetId', prSetId)
    startTransition(() => toggleReactionAction(fd))
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      aria-label={t('reactCongrats')}
      className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 disabled:opacity-50"
      style={{
        background: didReact ? 'rgba(255, 122, 130, 0.18)' : 'rgba(255, 255, 255, 0.04)',
        border: didReact
          ? '1px solid rgba(255, 122, 130, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        color: didReact ? '#FF7A82' : 'rgba(255, 255, 255, 0.55)',
      }}
    >
      <Flame className={`h-3.5 w-3.5 ${isPending ? 'animate-pulse' : ''}`} />
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </button>
  )
}
