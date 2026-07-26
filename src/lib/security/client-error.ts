export function sanitizeReportedUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.origin}${url.pathname}`.slice(0, 300)
  } catch {
    return ''
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b(token|access_token|refresh_token|token_hash|code)=([^&\s]+)/gi, '$1=[redacted]')
    .replace(/\b(authorization:\s*bearer)\s+\S+/gi, '$1 [redacted]')
}
