import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { UpdateBanner } from '@/components/UpdateBanner'
import { ClientErrorReporter } from '@/components/ClientErrorReporter'
import { InstallPrompt } from '@/components/InstallPrompt'
import './globals.css'

export const metadata: Metadata = {
  title: 'Formly',
  description: 'Track your training progress',
  appleWebApp: {
    capable: true,
    title: 'Formly',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  // `error` belongs here rather than in a nested layout: error.tsx sits at the
  // root so it covers onboarding and auth too, and by the time it renders the
  // nested providers have unmounted with the subtree that failed.
  const { install, updateBanner, error } = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className="text-white min-h-screen" style={{ background: '#0A0A0F' }}>
        <NextIntlClientProvider messages={{ install, updateBanner, error }}>
          {children}
          <InstallPrompt />
          <UpdateBanner />
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
        <ClientErrorReporter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
