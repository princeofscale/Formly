'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, Home, TrendingUp, ClipboardList, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TabDef {
  href: string
  altMatches?: string[]
  icon: typeof Dumbbell
  labelKey: 'home' | 'workouts' | 'progress' | 'plan' | 'profile'
}

const TABS: TabDef[] = [
  { href: '/dashboard', icon: Home, labelKey: 'home' },
  { href: '/history', icon: Dumbbell, labelKey: 'workouts' },
  { href: '/progress', icon: TrendingUp, labelKey: 'progress' },
  {
    href: '/workout/new',
    icon: ClipboardList,
    labelKey: 'plan',
    altMatches: ['/exercise-library', '/workout'],
  },
  { href: '/profile', icon: User, labelKey: 'profile' },
]

function matchesTab(pathname: string, tab: TabDef): boolean {
  if (pathname === tab.href || pathname.startsWith(tab.href + '/')) return true
  return (tab.altMatches ?? []).some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function BottomTabBar() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <nav className="tar-nav">
      <div className="tar-nav-list">
        {TABS.map((tab) => {
          const active = matchesTab(pathname, tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              className={`tar-nav-item${active ? ' on' : ''}`}
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tar-nav-pill" aria-hidden />
              <Icon className="tar-nav-ico" />
              <span className="tar-nav-lab">{t(tab.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
