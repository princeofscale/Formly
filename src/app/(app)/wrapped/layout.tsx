import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function WrappedLayout({ children }: { children: React.ReactNode }) {
  const { wrapped } = await getMessages()

  return <NextIntlClientProvider messages={{ wrapped }}>{children}</NextIntlClientProvider>
}
