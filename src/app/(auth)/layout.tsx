// src/app/(auth)/layout.tsx
import { Dumbbell, TrendingUp, Brain } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/auth/LocaleSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Левая панель — только на md+ */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-zinc-900 to-black border-r border-amber-500/20">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-amber-500" />
          <span className="font-black text-xl tracking-wider">GYMLOG</span>
        </div>

        <div className="space-y-10">
          <p className="text-4xl font-black leading-tight">
            {t('slogan')}
          </p>
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-zinc-400">
              <Dumbbell className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.log')}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <TrendingUp className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.track')}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Brain className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.ai')}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-700">© 2026 GymLog</p>
      </div>

      {/* Правая панель — форма */}
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-end p-4">
          <LocaleSwitcher current={locale} />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 pb-12">
          {children}
        </div>
      </div>
    </div>
  )
}
