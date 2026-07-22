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
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className="text-white min-h-screen" style={{ background: '#0A0A0F' }}>
        <NextIntlClientProvider messages={messages}>
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
