'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, History, Trophy, BarChart2, BookOpen, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Dumbbell, key: 'home' },
  { href: '/history', icon: History, key: 'history' },
  { href: '/records', icon: Trophy, key: 'records' },
  { href: '/analytics', icon: BarChart2, key: 'analytics' },
  { href: '/exercise-library', icon: BookOpen, key: 'library' },
] as const

export function AppNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex fixed left-0 top-0 h-screen w-14 flex-col items-center py-4 gap-1 z-20"
        style={{ background: 'rgba(5,5,16,0.7)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Logo */}
        <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>

        {/* Main nav */}
        <div className="flex flex-col items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={t(key)}
                className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                  active
                    ? 'text-amber-500 bg-amber-500/15'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {active && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
        </div>

        {/* Profile */}
        <Link
          href="/profile"
          title={t('profile')}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            pathname.startsWith('/profile')
              ? 'text-amber-500 bg-amber-500/15'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <User className="h-5 w-5" />
        </Link>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-20 px-2"
        style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 transition-colors py-1 px-1.5 ${
                active ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{t(key)}</span>
            </Link>
          )
        })}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 transition-colors py-1 px-1.5 ${
            pathname.startsWith('/profile') ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-medium">{t('profile')}</span>
        </Link>
      </nav>
    </>
  )
}
