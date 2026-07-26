import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function OfflineLayout({ children }: { children: React.ReactNode }) {
  const { offline } = await getMessages()

  return <NextIntlClientProvider messages={{ offline }}>{children}</NextIntlClientProvider>
}
