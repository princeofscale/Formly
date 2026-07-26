import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { notifications, profile } = await getMessages()

  return (
    <NextIntlClientProvider messages={{ notifications, profile }}>
      {children}
    </NextIntlClientProvider>
  )
}
