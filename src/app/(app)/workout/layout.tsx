import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const { exerciseForm, history, offline, onboarding, presets, templates, workout } =
    await getMessages()

  return (
    <NextIntlClientProvider
      messages={{ exerciseForm, history, offline, onboarding, presets, templates, workout }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
