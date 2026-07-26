import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function FriendsLayout({ children }: { children: React.ReactNode }) {
  const { friends } = await getMessages()

  return <NextIntlClientProvider messages={{ friends }}>{children}</NextIntlClientProvider>
}
