export function safeRedirectPath(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return /[\u0000-\u001f\u007f]/.test(value) ? fallback : value
}
