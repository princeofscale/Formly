import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Baseline security headers. CSP is intentionally NOT included here yet — Next.js
// inlines styles/scripts that need either a nonce-based CSP or 'unsafe-inline',
// and adding a strict CSP without testing risks silently breaking the PWA.
// Frame-ancestors below covers the same clickjacking surface as a CSP would.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  // Tree-shake icon barrel imports — without this Next.js may include all
  // lucide-react icons even when each component imports only 2–3 of them.
  // ~73 files import from lucide-react across this project.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default withNextIntl(nextConfig)
