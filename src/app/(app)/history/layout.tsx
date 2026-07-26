import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function HistoryLayout({ children }: { children: React.ReactNode }) {
  const { coach, history } = await getMessages()

  return <NextIntlClientProvider messages={{ coach, history }}>{children}</NextIntlClientProvider>
}
