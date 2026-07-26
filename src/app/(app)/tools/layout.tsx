import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const { tools } = await getMessages()

  return <NextIntlClientProvider messages={{ tools }}>{children}</NextIntlClientProvider>
}
