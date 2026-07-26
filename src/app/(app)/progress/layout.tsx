import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function ProgressLayout({ children }: { children: React.ReactNode }) {
  const { progress } = await getMessages()

  return <NextIntlClientProvider messages={{ progress }}>{children}</NextIntlClientProvider>
}
