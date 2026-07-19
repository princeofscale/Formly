import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  // Page moved out of (app) group, so the layout no longer enforces auth.
  // Verify here directly, and bounce already-onboarded users to dashboard
  // so they don't accidentally redo onboarding by visiting /onboarding.
  const { user } = await verifySession()
  const supabase = await createClient()
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', user.id)
    .maybeSingle()
  const profile = profileRaw as unknown as { onboarded_at: string | null } | null
  if (profile?.onboarded_at) redirect('/dashboard')

  return <OnboardingWizard vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
}
