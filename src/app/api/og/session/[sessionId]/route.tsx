import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSessionSummary } from '@/lib/services/session-summary.service'
import { formatCardDate } from '@/lib/services/workout-share.service'
import { renderCard, toCardData } from '../../card'

export const runtime = 'nodejs'

// The owner's own preview. Anything meant to survive being pasted into a chat
// goes through /api/og/share/[token], which needs no session — a crawler has
// none and would only ever get the 401 below.
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  try {
    const { user } = await verifySession()
    const supabase = await createClient()

    const { data: session } = await supabase
      .from('workout_sessions')
      .select('id, started_at, user_id')
      .eq('id', sessionId)
      .single()

    if (!session || session.user_id !== user.id) {
      return new Response('Not found', { status: 404 })
    }

    const summary = await getSessionSummary(supabase, user.id, sessionId)
    if (!summary) return new Response('No data', { status: 404 })

    return renderCard(toCardData(summary, formatCardDate(session.started_at as string)))
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }
}
