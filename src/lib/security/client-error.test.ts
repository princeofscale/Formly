import { describe, expect, it } from 'vitest'
import { redactSensitiveText, sanitizeReportedUrl } from './client-error'

describe('sanitizeReportedUrl', () => {
  it('drops query strings and fragments', () => {
    expect(
      sanitizeReportedUrl('https://formly.app/reset-password?token=secret#access_token=secret'),
    ).toBe('https://formly.app/reset-password')
  })

  it('rejects malformed and non-http URLs', () => {
    expect(sanitizeReportedUrl('not a url')).toBe('')
    expect(sanitizeReportedUrl('javascript:alert(1)')).toBe('')
  })
})

describe('redactSensitiveText', () => {
  it('redacts common token and authorization forms', () => {
    expect(redactSensitiveText('token=abc123 Authorization: Bearer secret-value')).toBe(
      'token=[redacted] Authorization: Bearer [redacted]',
    )
  })
})
