import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'
import { config } from '@/lib/config'

export function createClient() {
  return createBrowserClient<Database>(config.supabase.url, config.supabase.anonKey)
}
