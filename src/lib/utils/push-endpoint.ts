const PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
])

/**
 * Windows Push Notification Services hands out per-region hosts —
 * `wns2-bl2p.notify.windows.com` and siblings — so Edge on Windows cannot be
 * covered by a fixed list and was silently rejected by one.
 *
 * Only subdomains qualify. The leading dot is what keeps a lookalike such as
 * `evilnotify.windows.com` out, which a bare `endsWith('notify.windows.com')`
 * would have admitted.
 */
const WNS_SUFFIX = '.notify.windows.com'

export function isSupportedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      (PUSH_HOSTS.has(url.hostname) || url.hostname.endsWith(WNS_SUFFIX)) &&
      url.port === '' &&
      url.username === '' &&
      url.password === ''
    )
  } catch {
    return false
  }
}
