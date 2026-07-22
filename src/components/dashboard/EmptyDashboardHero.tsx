'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Dumbbell, Bookmark, Sparkles, ChevronRight, Trophy, Zap, Timer } from 'lucide-react'

interface Props {
  hasSchedule: boolean
}

export function EmptyDashboardHero({ hasSchedule }: Props) {
  const t = useTranslations('dashboard.empty')

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero card */}
      <div
        className="rounded-[28px] p-6 sm:p-8"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(255, 196, 68, 0.14), transparent 55%), radial-gradient(circle at 100% 100%, rgba(167, 139, 250, 0.10), transparent 55%), #15151C',
          border: '1px solid rgba(255, 196, 68, 0.25)',
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{ color: '#FFC044' }}
        >
          {t('label')}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t('title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 max-w-md leading-relaxed">{t('subtitle')}</p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Link
            href="/workout/new"
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,59,71,0.32)] transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Dumbbell className="h-4 w-4" />
            {t('primary')}
          </Link>
          {!hasSchedule && (
            <Link
              href="/onboarding"
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold transition active:scale-[0.98]"
              style={{
                background: 'rgba(255, 196, 68, 0.10)',
                color: '#FFC044',
                border: '1px solid rgba(255, 196, 68, 0.30)',
              }}
            >
              <Sparkles className="h-4 w-4" />
              {t('secondary')}
            </Link>
          )}
        </div>
      </div>

      {/* What you'll get tiles */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile
          icon={<Trophy className="h-4 w-4" style={{ color: '#FFC044' }} />}
          label={t('promise.records')}
          color="#FFC044"
        />
        <Tile
          icon={<Zap className="h-4 w-4" style={{ color: '#22D3A8' }} />}
          label={t('promise.progress')}
          color="#22D3A8"
        />
        <Tile
          icon={<Timer className="h-4 w-4" style={{ color: '#A78BFA' }} />}
          label={t('promise.coach')}
          color="#A78BFA"
        />
      </div>

      {/* Quick start links */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 pt-2">
          {t('quickStart')}
        </p>

        <QuickLink
          href="/workout/new"
          icon={<Dumbbell className="h-5 w-5" style={{ color: '#FF6E76' }} />}
          title={t('quick.start.title')}
          sub={t('quick.start.sub')}
          color="#FF6E76"
        />
        <QuickLink
          href="/workout/new"
          icon={<Bookmark className="h-5 w-5" style={{ color: '#A78BFA' }} />}
          title={t('quick.preset.title')}
          sub={t('quick.preset.sub')}
          color="#A78BFA"
        />
        <QuickLink
          href="/tools/1rm"
          icon={<Sparkles className="h-5 w-5" style={{ color: '#5EEAD4' }} />}
          title={t('quick.calc.title')}
          sub={t('quick.calc.sub')}
          color="#5EEAD4"
        />
      </div>

      <div className="flex items-center justify-center gap-2 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/30">
        <Sparkles className="h-3 w-3" />
        {t('footer')}
      </div>
    </div>
  )
}

interface TileProps {
  icon: React.ReactNode
  label: string
  color: string
}

function Tile({ icon, label, color }: TileProps) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col items-start gap-1.5"
      style={{
        background: `${color}0E`,
        border: `1px solid ${color}26`,
      }}
    >
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center"
        style={{ background: `${color}22` }}
      >
        {icon}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/80 leading-tight">
        {label}
      </p>
    </div>
  )
}

interface QuickLinkProps {
  href: string
  icon: React.ReactNode
  title: string
  sub: string
  color: string
}

function QuickLink({ href, icon, title, sub, color }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl p-4 transition hover:bg-white/[0.04]"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${color}1F` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[11px] text-white/50 leading-tight">{sub}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
    </Link>
  )
}
