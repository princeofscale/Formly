import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { aiInsights, coach, dashboard, friends } = await getMessages()

  return (
    <NextIntlClientProvider messages={{ aiInsights, coach, dashboard, friends }}>
      {children}
    </NextIntlClientProvider>
  )
}
