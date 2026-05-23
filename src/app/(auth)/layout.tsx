import { Dumbbell, TrendingUp, Brain } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/auth/LocaleSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen grid md:grid-cols-2 relative z-10">
      {/* Left panel */}
      <div
        className="hidden md:flex flex-col justify-between p-12 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(5,5,16,0.5)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-xl tracking-wider">TRAININGAR</span>
        </div>

        <div className="space-y-10">
          <p className="text-4xl font-black leading-tight">{t('slogan')}</p>
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

        <p className="text-xs text-zinc-700">© 2026 TrainingAR</p>
      </div>

      {/* Right panel — form */}
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
