import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { BottomTabBar } from '@/components/BottomTabBar'
import { OnboardingModal } from '@/components/OnboardingModal'
import { PageWrapper } from '@/components/PageWrapper'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('weight_kg, height_cm')
    .eq('id', user.id)
    .single()

  const needsOnboarding = !profile?.weight_kg && !profile?.height_cm

  return (
    <div className="min-h-screen">
      <main className="pb-24">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <PageWrapper>{children}</PageWrapper>
        </div>
      </main>

      <BottomTabBar />

      {needsOnboarding && <OnboardingModal />}
    </div>
  )
}
