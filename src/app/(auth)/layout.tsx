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
      <div className="min-h-screen grid md:grid-cols-2 relative">
        {/* Left panel — desktop only */}
        <div
          className="hidden md:flex flex-col justify-between p-12"
          style={{
            borderRight: '1px solid rgba(245,241,232,0.08)',
            background: 'rgba(5,5,16,0.45)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div className="tar-wordmark">
            <span className="dot" />
            Formly
          </div>

          <div className="space-y-10">
            <p
              className="tar-h text-[44px] leading-[1.02]"
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              {t('slogan')}
            </p>
            <div className="space-y-5 tar-stagger">
              {(
                [
                  { Icon: Dumbbell, key: 'log' },
                  { Icon: TrendingUp, key: 'track' },
                  { Icon: Brain, key: 'ai' },
                ] as const
              ).map(({ Icon, key }) => (
                <div
                  key={key}
                  className="flex items-center gap-3"
                  style={{ color: 'var(--tar-ink-dim)' }}
                >
                  <Icon className="h-5 w-5 shrink-0" style={{ color: 'var(--tar-brand-2)' }} />
                  <span className="text-sm">{t(`features.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--tar-ink-mute)' }}>
            © 2026 Formly
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-col min-h-screen">
          <div className="flex justify-end p-4">
            <LocaleSwitcher current={locale} />
          </div>

          {/* Mobile-only brand mark */}
          <div className="md:hidden flex items-center justify-center pt-2 pb-6">
            <div className="tar-wordmark">
              <span className="dot" />
              Formly
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 pb-12">{children}</div>
        </div>
      </div>
    </>
  )
}
