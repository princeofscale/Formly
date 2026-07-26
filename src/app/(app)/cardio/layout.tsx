import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function CardioLayout({ children }: { children: React.ReactNode }) {
  const { cardio } = await getMessages()

  return <NextIntlClientProvider messages={{ cardio }}>{children}</NextIntlClientProvider>
}
