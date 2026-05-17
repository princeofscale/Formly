'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, TrendingUp, ClipboardList, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TabDef {
  href: string
  altMatches?: string[]
  icon: typeof Dumbbell
  labelKey: 'workouts' | 'progress' | 'plan' | 'profile'
}

const TABS: TabDef[] = [
  { href: '/history',           icon: Dumbbell,      labelKey: 'workouts', altMatches: ['/dashboard'] },
  { href: '/progress',          icon: TrendingUp,    labelKey: 'progress' },
  { href: '/workout/new',       icon: ClipboardList, labelKey: 'plan',     altMatches: ['/exercise-library', '/workout'] },
  { href: '/profile',           icon: User,          labelKey: 'profile',  altMatches: ['/body'] },
]

function isActive(pathname: string, tab: TabDef): boolean {
  if (pathname === tab.href || pathname.startsWith(tab.href + '/')) return true
  return (tab.altMatches ?? []).some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function BottomTabBar() {
  const pathname = usePathname()
  const t = useTranslations('nav')

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
      <div className="max-w-2xl mx-auto flex items-stretch justify-around h-16 px-2">
        {TABS.map(tab => {
          const active = isActive(pathname, tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all"
              aria-label={t(tab.labelKey)}
            >
              <div
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-[10px] transition-all duration-200"
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
                  className="h-5 w-5 transition-colors"
                  style={{ color: active ? '#FF3B47' : 'rgba(255,255,255,0.5)' }}
                />
                <span
                  className="text-[10px] font-medium tracking-wide transition-colors"
                  style={{ color: active ? '#FF3B47' : 'rgba(255,255,255,0.5)' }}
                >
                  {t(tab.labelKey)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
