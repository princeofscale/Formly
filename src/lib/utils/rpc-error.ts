/**
 * HTTP status for a failed offline-flush RPC.
 *
 * The offline queue retries 5xx and dead-letters 4xx, so this mapping is not
 * cosmetic. Reporting a permanent failure as 500 leaves the record cycling
 * forever and blocking every later item behind it — a set belonging to a
 * session that was already finished, or to a previous account on a shared
 * device, would never drain.
 *
 * The decision reads the SQLSTATE the RPC raised rather than matching on
 * message text, so rewording an error message cannot silently change whether
 * the client keeps retrying.
 */
export function rpcErrorStatus(code: string | null | undefined): number {
  switch (code) {
    // insufficient_privilege — no authenticated user behind the request.
    case '42501':
      return 401
    // invalid_parameter_value — the session is missing, already finished, or
    // owned by somebody else. Retrying cannot change any of the three.
    case '22023':
      return 422
    default:
      return 500
  }
}
