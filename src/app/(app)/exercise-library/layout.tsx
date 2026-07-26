import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function ExerciseLibraryLayout({ children }: { children: React.ReactNode }) {
  const { exerciseForm, exerciseLibrary, history } = await getMessages()

  return (
    <NextIntlClientProvider messages={{ exerciseForm, exerciseLibrary, history }}>
      {children}
    </NextIntlClientProvider>
  )
}
