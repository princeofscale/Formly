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

  it('accepts the regional WNS hosts Edge on Windows is handed', () => {
    // Edge subscriptions land on a per-region host, so a fixed allowlist
    // rejected every Windows athlete's registration.
    expect(isSupportedPushEndpoint('https://wns2-bl2p.notify.windows.com/w/?token=abc')).toBe(true)
    expect(isSupportedPushEndpoint('https://wns2-am3p.notify.windows.com/w/?token=abc')).toBe(true)
    expect(isSupportedPushEndpoint('https://notify.windows.com/w/?token=abc')).toBe(true)
  })

  it('rejects a lookalike of the WNS domain', () => {
    expect(isSupportedPushEndpoint('https://evilnotify.windows.com/w/')).toBe(false)
    expect(isSupportedPushEndpoint('https://notify.windows.com.evil.test/w/')).toBe(false)
  })
})
