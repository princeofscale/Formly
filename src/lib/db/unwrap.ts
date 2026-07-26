import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Raised when a database read fails, as opposed to returning nothing.
 *
 * The distinction is the entire point. Swallowing the error and returning an
 * empty array tells the athlete "you have no workouts" when the truth is
 * "we could not ask" — the one message that is both wrong and alarming.
 */
export class DatabaseError extends Error {
  readonly code: string | undefined

  constructor(context: string, error: PostgrestError) {
    super(`${context}: ${error.message}`)
    this.name = 'DatabaseError'
    this.code = error.code
  }
}

/**
 * Returns the rows, or throws if the query failed.
 *
 * @param context what was being read, for the message a developer will see
 */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string,
): T | null {
  if (result.error) throw new DatabaseError(context, result.error)
  return result.data
}

/** The same, for reads whose natural empty value is a list. */
export function unwrapRows<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  context: string,
): T[] {
  if (result.error) throw new DatabaseError(context, result.error)
  return result.data ?? []
}
