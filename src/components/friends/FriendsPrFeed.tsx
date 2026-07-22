'use client'

import { useMemo, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'
import { toggleReactionAction } from '@/app/(app)/friends/actions'
import type { FriendRecentPR } from '@/lib/db/prs'
import { weightUnit } from '@/lib/units'

interface Props {
  prs: FriendRecentPR[]
}

// Top-level helper so Date.now() stays out of the render path
// (React Compiler purity rule).
function buildTimeAgoLabels(prs: FriendRecentPR[], locale: string): Map<string, string> {
  const now = Date.now()
  const m = new Map<string, string>()
  for (const pr of prs) {
    const days = Math.floor((now - new Date(pr.achieved_at).getTime()) / 86400000)
    const label =
      days <= 0
        ? locale === 'ru'
          ? 'сегодня'
          : 'today'
        : days === 1
          ? locale === 'ru'
            ? 'вчера'
            : 'yesterday'
          : locale === 'ru'
            ? `${days}д назад`
            : `${days}d ago`
    m.set(pr.pr_set_id, label)
  }
  return m
}

export function FriendsPrFeed({ prs }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const timeAgoMap = useMemo(() => buildTimeAgoLabels(prs, locale), [prs, locale])

  if (prs.length === 0) return null

  return (
    <div className="tar-fr-list tar-d-rise tar-d-rise-5">
      {prs.map((pr) => {
        const athleteName = pr.display_name?.trim() || pr.friend_code || t('anonymous')
        const name = locale === 'ru' ? (pr.exercise_name_ru ?? pr.exercise_name) : pr.exercise_name
        const delta =
          pr.improvement_pct != null ? `+${pr.improvement_pct.toFixed(1)}%` : t('firstRecord')
        return (
          <div key={pr.pr_set_id} className="tar-fr-pr">
            <span className="tar-fr-av">{athleteName.slice(0, 2).toUpperCase()}</span>
            <div className="bx">
              <div className="row1">
                <span className="code">{athleteName}</span>
                <span className="ago">{timeAgoMap.get(pr.pr_set_id)}</span>
              </div>
              <div className="ex">{name}</div>
              <div className="set tabular-nums">
                {pr.weight_kg}
                {kg} × {pr.reps} <b>{delta}</b>
              </div>
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
      className={`tar-fr-react${didReact ? ' on' : ''} disabled:opacity-50`}
    >
      <Flame className={`i${isPending ? ' animate-pulse' : ''}`} />
      <b className="tabular-nums">{count}</b>
    </button>
  )
}
