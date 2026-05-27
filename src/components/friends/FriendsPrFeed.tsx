'use client'

import { useMemo, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Flame, Trophy } from 'lucide-react'
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
  const e1rmLabel = locale === 'ru' ? 'e1ПМ' : 'e1RM'

  const timeAgoMap = useMemo(() => buildTimeAgoLabels(prs, locale), [prs, locale])

  if (prs.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="tar-d-eyebrow flex items-center gap-1.5">
        <Trophy className="h-3 w-3" style={{ color: 'var(--tar-brand-2)' }} />
        {t('prFeedTitle', { n: prs.length })}
      </div>
      <div
        className="space-y-1"
        style={{
          padding: 8,
          borderRadius: 'var(--tar-r-xl)',
          background: 'var(--tar-bg-elevated)',
          border: '1px solid var(--tar-line)',
        }}
      >
        {prs.map((pr) => {
          const name =
            locale === 'ru' ? (pr.exercise_name_ru ?? pr.exercise_name) : pr.exercise_name
          const e1rm = Math.round(pr.current_best)
          const delta =
            pr.improvement_pct != null ? `+${pr.improvement_pct.toFixed(1)}%` : t('firstRecord')
          return (
            <div
              key={pr.pr_set_id}
              className="flex items-center gap-3 transition"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--tar-r-md)',
              }}
            >
              <div
                className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center tabular-nums"
                style={{
                  background: 'rgba(167, 139, 250, 0.16)',
                  color: '#A78BFA',
                  font: '800 13px/1 var(--tar-tight)',
                  letterSpacing: '0.04em',
                }}
              >
                {(pr.friend_code ?? '??').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="tabular-nums"
                    style={{
                      font: '700 12px/1 var(--tar-mono)',
                      letterSpacing: '0.08em',
                      color: 'var(--tar-ink-dim)',
                    }}
                  >
                    {pr.friend_code ?? '······'}
                  </span>
                  <span
                    style={{
                      font: '500 10px/1 var(--tar-mono)',
                      letterSpacing: '0.06em',
                      color: 'var(--tar-ink-soft)',
                    }}
                  >
                    {timeAgoMap.get(pr.pr_set_id)}
                  </span>
                </div>
                <p
                  className="mt-1 truncate"
                  style={{
                    font: '700 14px/1.2 var(--tar-text)',
                    color: 'var(--tar-ink)',
                  }}
                >
                  {name}
                </p>
                <p
                  className="mt-1 tabular-nums"
                  style={{
                    font: '500 11px/1 var(--tar-mono)',
                    letterSpacing: '0.06em',
                    color: 'var(--tar-ink-mute)',
                  }}
                >
                  {pr.weight_kg}
                  {kg} × {pr.reps} · {e1rmLabel} {e1rm}{' '}
                  <span style={{ color: 'var(--tar-success)' }}>{delta}</span>
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
      className="flex shrink-0 items-center gap-1 transition active:scale-95 disabled:opacity-50"
      style={{
        padding: '7px 12px',
        borderRadius: 100,
        background: didReact ? 'rgba(255, 122, 130, 0.16)' : 'var(--tar-card)',
        border: didReact ? '1px solid rgba(255, 122, 130, 0.42)' : '1px solid var(--tar-line)',
        color: didReact ? '#FF7A82' : 'var(--tar-ink-mute)',
        font: '700 11px/1 var(--tar-mono)',
        letterSpacing: '0.04em',
      }}
    >
      <Flame className={`h-3.5 w-3.5 ${isPending ? 'animate-pulse' : ''}`} />
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </button>
  )
}
