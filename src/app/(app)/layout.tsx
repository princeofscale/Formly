import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { AppNav } from '@/components/AppNav'
import { OnboardingModal } from '@/components/OnboardingModal'

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
    <div className="min-h-screen flex">
      <AppNav />

      {/* Main content — left margin on desktop for sidebar, bottom padding on mobile for bottom bar */}
      <main className="flex-1 md:ml-14 pb-20 md:pb-0 relative z-10">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {needsOnboarding && <OnboardingModal />}
    </div>
  )
}
