import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Formly',
    short_name: 'Formly',
    description: 'Track workouts, log progress, hit PRs',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050510',
    theme_color: '#050510',
    icons: [
      { src: '/icon.png', sizes: '256x256', type: 'image/png' },
      { src: '/branding/formly-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/branding/formly-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
