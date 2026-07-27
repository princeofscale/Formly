import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function WorkoutLayout({ children }: { children: React.ReactNode }) {
  // exerciseLibrary: ExerciseForm labels its equipment picker from that
  // namespace, and the form opens inside an active workout too.
  const {
    exerciseForm,
    exerciseLibrary,
    history,
    offline,
    onboarding,
    presets,
    templates,
    workout,
  } = await getMessages()

  return (
    <NextIntlClientProvider
      messages={{
        exerciseForm,
        exerciseLibrary,
        history,
        offline,
        onboarding,
        presets,
        templates,
        workout,
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
