import { describe, expect, it } from 'vitest'
import { isSupportedPushEndpoint } from './push-endpoint'

describe('isSupportedPushEndpoint', () => {
  it('accepts browser push services and rejects arbitrary HTTPS targets', () => {
    expect(isSupportedPushEndpoint('https://fcm.googleapis.com/fcm/send/token')).toBe(true)
    expect(
      isSupportedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/token'),
    ).toBe(true)
    expect(isSupportedPushEndpoint('https://web.push.apple.com/token')).toBe(true)
    expect(isSupportedPushEndpoint('https://127.0.0.1/internal')).toBe(false)
    expect(isSupportedPushEndpoint('https://fcm.googleapis.com.evil.test/token')).toBe(false)
    expect(isSupportedPushEndpoint('https://user@fcm.googleapis.com/token')).toBe(false)
  })
})
