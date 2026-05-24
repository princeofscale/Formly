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
    <nav
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-2xl items-stretch justify-around px-1">
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
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              aria-label={t(tab.labelKey)}
            >
              <div
                className="relative flex flex-col items-center gap-1 rounded-[10px] px-2 py-1.5 transition-all duration-150 sm:px-3"
                style={
                  active
                    ? {
                        background: 'rgba(255, 59, 71, 0.12)',
                        boxShadow: '0 0 16px rgba(255, 59, 71, 0.25)',
                      }
                    : undefined
                }
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${isLoading ? 'animate-pulse' : ''}`}
                  style={{ color: active ? '#FF3B47' : 'rgba(255,255,255,0.5)' }}
                />
                <span
                  className="text-[10px] font-medium tracking-wide transition-colors"
                  style={{ color: active ? '#FF3B47' : 'rgba(255,255,255,0.5)' }}
                >
                  {t(tab.labelKey)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
