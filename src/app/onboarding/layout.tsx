import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { onboarding } = await getMessages()

  return <NextIntlClientProvider messages={{ onboarding }}>{children}</NextIntlClientProvider>
}
