import { Dumbbell, TrendingUp, Brain } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/auth/LocaleSwitcher'
import { AnimatedAuthBackground } from '@/components/auth/AnimatedAuthBackground'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const t = await getTranslations('auth')

  return (
    <>
      <AnimatedAuthBackground />
      <div className="min-h-screen grid md:grid-cols-2 relative z-10">
        {/* Left panel */}
        <div
          className="hidden md:flex flex-col justify-between p-12 border-r"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(5,5,16,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="auth-brand w-9 h-9 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-xl tracking-wider">TRAININGAR</span>
          </div>

          <div className="space-y-10">
            <p
              className="text-4xl font-black leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              {t('slogan')}
            </p>
            <div className="space-y-5">
              {(
                [
                  { Icon: Dumbbell, key: 'log', delay: 240 },
                  { Icon: TrendingUp, key: 'track', delay: 360 },
                  { Icon: Brain, key: 'ai', delay: 480 },
                ] as const
              ).map(({ Icon, key, delay }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 text-zinc-400 animate-in fade-in slide-in-from-left-4 duration-700"
                  style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
                >
                  <Icon className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="text-sm">{t(`features.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <p
            className="text-xs text-zinc-700 animate-in fade-in duration-1000"
            style={{ animationDelay: '700ms', animationFillMode: 'both' }}
          >
            © 2026 TrainingAR
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-col min-h-screen">
          <div className="flex justify-end p-4">
            <LocaleSwitcher current={locale} />
          </div>

          {/* Mobile-only brand mark (left panel is hidden under md) */}
          <div className="md:hidden flex items-center justify-center gap-2.5 pt-2 pb-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="auth-brand w-9 h-9 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-wider">TRAININGAR</span>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 pb-12">{children}</div>
        </div>
      </div>
    </>
  )
}
