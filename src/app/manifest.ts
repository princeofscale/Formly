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
      { src: '/icon', sizes: '256x256', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
