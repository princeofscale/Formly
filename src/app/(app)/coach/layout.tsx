import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const { coach } = await getMessages()

  return <NextIntlClientProvider messages={{ coach }}>{children}</NextIntlClientProvider>
}
