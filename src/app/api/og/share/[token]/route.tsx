import { createClient } from '@supabase/supabase-js'
import { isCardData } from '@/lib/services/workout-share.service'
import { renderCard } from '../../card'

export const runtime = 'nodejs'

// Deliberately unauthenticated: the readers are Telegram, Discord and every
// other link crawler, none of which carry a session. Access is bounded by the
// token instead — the RPC only answers for a share that exists and has not
// been revoked, and it answers a revoked and an unknown token identically, so
// the endpoint cannot be used to find out which tokens are real.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response('Not found', { status: 404 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return new Response('Not configured', { status: 500 })

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('get_shared_workout', { p_token: token })
  if (error || !isCardData(data)) return new Response('Not found', { status: 404 })

  const response = renderCard(data)
  // A snapshot never changes, so it is worth caching hard; a revoked share
  // stops being served once the cache entry expires.
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
  return response
}
