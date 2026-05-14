import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { InstallPrompt } from '@/components/InstallPrompt'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'GymLog',
  description: 'Track your training progress',
  appleWebApp: {
    capable: true,
    title: 'GymLog',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#050510',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} text-zinc-50 min-h-screen relative`}>
        {/* Aurora background */}
        <div className="aurora-blob aurora-blob-1" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-2" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-3" aria-hidden="true" />
        <NextIntlClientProvider messages={messages}>
          {children}
          <InstallPrompt />
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
