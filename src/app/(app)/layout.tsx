import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { BottomTabBar } from '@/components/BottomTabBar'
import { PageWrapper } from '@/components/PageWrapper'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()
  const supabase = await createClient()

  // Gate: anyone who hasn't completed onboarding (or skipped it explicitly)
  // gets bounced to the wizard. /onboarding lives outside this layout so
  // it's not subject to this redirect → no loop.
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileRaw as unknown as { onboarded_at: string | null } | null
  if (!profile?.onboarded_at) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen">
      <main className="pb-24">
        <div className="container mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
          <PageWrapper>{children}</PageWrapper>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
