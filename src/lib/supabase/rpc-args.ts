/**
 * Passes NULL to a database function argument the generated types call required.
 *
 * PostgREST's schema metadata does not say whether a function argument accepts
 * NULL, so `supabase gen types` declares every argument non-null. Several of
 * ours mean something specific by NULL: `complete_onboarding` coalesces a null
 * location back to the stored one, and an omitted RPE is null rather than zero.
 * The call sites are right and the generated type is merely imprecise.
 *
 * A named helper rather than an inline cast, so the deliberate nulls are
 * greppable and the reason is written down once instead of three times.
 */
export function nullableArg<T>(value: T | null | undefined): T {
  return (value ?? null) as T
}
