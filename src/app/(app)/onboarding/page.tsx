import { getTranslations } from 'next-intl/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const t = await getTranslations('onboarding')

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start">
      <OnboardingWizard
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        labels={{
          step: t('step'),
          back: t('back'),
          next: t('next'),
          skip: t('skip'),
          finish: t('finish'),
          hero: t('hero'),
          subtitle: t('subtitle'),
          goalTitle: t('goalTitle'),
          goalSub: t('goalSub'),
          goalStrength: t('goalStrength'),
          goalStrengthSub: t('goalStrengthSub'),
          goalHypertrophy: t('goalHypertrophy'),
          goalHypertrophySub: t('goalHypertrophySub'),
          goalGeneral: t('goalGeneral'),
          goalGeneralSub: t('goalGeneralSub'),
          locTitle: t('locTitle'),
          locSub: t('locSub'),
          locGym: t('locGym'),
          locGymSub: t('locGymSub'),
          locDumbbells: t('locDumbbells'),
          locDumbbellsSub: t('locDumbbellsSub'),
          locBodyweight: t('locBodyweight'),
          locBodyweightSub: t('locBodyweightSub'),
          daysTitle: t('daysTitle'),
          daysSub: t('daysSub'),
          daysSuffix: t('daysSuffix'),
          notifTitle: t('notifTitle'),
          notifSub: t('notifSub'),
          notifEnable: t('notifEnable'),
          notifEnabled: t('notifEnabled'),
          notifLater: t('notifLater'),
          notifDenied: t('notifDenied'),
          notifUnsupported: t('notifUnsupported'),
        }}
      />
    </div>
  )
}
