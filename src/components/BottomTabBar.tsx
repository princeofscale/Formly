'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Prefetch all tabs on mount so navigation is instant after first paint
  useEffect(() => {
    for (const tab of TABS) {
      router.prefetch(tab.href)
    }
  }, [router])

  // Clear pending target once pathname catches up to it
  useEffect(() => {
    if (pendingHref && (pathname === pendingHref || pathname.startsWith(pendingHref + '/'))) {
      const id = window.setTimeout(() => setPendingHref(null), 0)
      return () => window.clearTimeout(id)
    }
  }, [pathname, pendingHref])

  // Effective "active tab" = pending click target (if any) or actual route match
  const pendingTab = pendingHref ? TABS.find((t) => t.href === pendingHref) : null
  const routeTab = TABS.find((tab) => matchesTab(pathname, tab))
  const activeTab = pendingTab ?? routeTab

  function handleClick(href: string) {
    if (href === activeTab?.href) return
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <nav className="tar-nav">
      <div className="tar-nav-list">
        {TABS.map((tab) => {
          const active = activeTab?.href === tab.href
          const isLoading = isPending && pendingHref === tab.href
          const Icon = tab.icon
          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => handleClick(tab.href)}
              onMouseEnter={() => router.prefetch(tab.href)}
              className={`tar-nav-item${active ? ' on' : ''}`}
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tar-nav-pill" aria-hidden />
              <Icon className={`tar-nav-ico${isLoading ? ' animate-pulse' : ''}`} />
              <span className="tar-nav-lab">{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
